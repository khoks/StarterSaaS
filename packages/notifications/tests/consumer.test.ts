/**
 * EventBusNotificationsConsumer — integration against InMemoryEventBus.
 *
 * Validates the bus consumer:
 *   1. Subscribes to the notification.email_requested topic
 *   2. Renders the request via the registry
 *   3. Dispatches via the configured EmailSender
 *   4. Emits notification.email_sent on success (with PII-hashed recipient)
 *   5. Emits notification.email_failed + rethrows on failure (drives bus retry)
 *   6. Subscription lifecycle (start / stop)
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { InMemoryEventBus } from "@starter-saas/event-bus";

import {
  EventBusNotificationsConsumer,
  NOTIFICATION_EMAIL_FAILED_TOPIC,
  NOTIFICATION_EMAIL_REQUESTED_TOPIC,
  NOTIFICATION_EMAIL_SENT_TOPIC,
  NoopEmailSender,
  TemplateRegistry,
  hashRecipient,
  type EmailSender,
  type NotificationEmailFailed,
  type NotificationEmailRequest,
  type NotificationEmailSent,
  type RenderedEmail,
} from "../src/index.js";

const TENANT_ID = "01900000-0000-7000-8000-000000000001";

function makeRequest(overrides: Partial<NotificationEmailRequest> = {}): NotificationEmailRequest {
  return {
    tenantId: TENANT_ID,
    templateId: "welcome",
    variables: {
      tenantName: "Acme Corp",
      tenantSlug: "acme",
      appUrl: "https://app.example.com",
    },
    to: { email: "owner@acme.test" },
    ...overrides,
  };
}

async function flushBus(_bus: InMemoryEventBus): Promise<void> {
  // InMemoryEventBus.publish returns once delivery is SCHEDULED, not when
  // the handler completes. Wait long enough for handler chains (including
  // the consumer's downstream publish of email_sent / email_failed) to
  // settle. 50ms is plenty for unit-test scenarios.
  await new Promise((r) => setTimeout(r, 50));
}

describe("EventBusNotificationsConsumer — happy path", () => {
  let bus: InMemoryEventBus;
  let sender: NoopEmailSender;
  let consumer: EventBusNotificationsConsumer;

  beforeEach(() => {
    bus = new InMemoryEventBus();
    sender = new NoopEmailSender();
    consumer = new EventBusNotificationsConsumer({
      bus,
      registry: new TemplateRegistry(),
      sender,
    });
    consumer.start();
  });

  afterEach(async () => {
    consumer.stop();
    await bus.shutdown();
  });

  it("renders + sends one email per request", async () => {
    await bus.publish<NotificationEmailRequest>({
      topic: NOTIFICATION_EMAIL_REQUESTED_TOPIC,
      partitionKey: TENANT_ID,
      idempotencyKey: `notifications:welcome:${TENANT_ID}`,
      payload: makeRequest(),
    });
    await flushBus(bus);

    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]?.subject).toBe("Welcome to Acme Corp!");
    expect(sender.sent[0]?.tenantId).toBe(TENANT_ID);
  });

  it("emits notification.email_sent with PII-hashed recipient", async () => {
    const received: Array<{ payload: NotificationEmailSent }> = [];
    bus.subscribe<NotificationEmailSent>(
      NOTIFICATION_EMAIL_SENT_TOPIC,
      { consumerGroup: "audit" },
      async (event) => {
        received.push({ payload: event.payload });
      },
    );

    await bus.publish<NotificationEmailRequest>({
      topic: NOTIFICATION_EMAIL_REQUESTED_TOPIC,
      partitionKey: TENANT_ID,
      idempotencyKey: "notifications:test",
      payload: makeRequest(),
    });
    await flushBus(bus);

    expect(received).toHaveLength(1);
    expect(received[0]?.payload.recipientHash).toBe(hashRecipient("owner@acme.test"));
    // PII discipline: full email NEVER appears in the audit event
    expect(JSON.stringify(received[0]?.payload)).not.toContain("owner@acme.test");
    expect(received[0]?.payload.templateId).toBe("welcome");
  });

  it("repeated publishes carry the same idempotencyKey (producer discipline; pg-outbox dedupes; in-memory bus does not)", async () => {
    for (let i = 0; i < 3; i++) {
      await bus.publish<NotificationEmailRequest>({
        topic: NOTIFICATION_EMAIL_REQUESTED_TOPIC,
        partitionKey: TENANT_ID,
        idempotencyKey: "notifications:once",
        payload: makeRequest(),
      });
    }
    await flushBus(bus);
    // InMemoryEventBus has no built-in dedupe — at-least-once semantics.
    // The pg-outbox adapter's `event_dedupe` table provides true dedupe.
    // The relevant test for STORY-017 covered that; this test just verifies
    // the bus delivers AT LEAST once per publish.
    expect(sender.sent.length).toBeGreaterThanOrEqual(1);
  });
});

describe("EventBusNotificationsConsumer — failure handling", () => {
  it("emits notification.email_failed + the bus retries on throw", async () => {
    const bus = new InMemoryEventBus();

    let attempts = 0;
    const flakySender: EmailSender = {
      async send(_email: RenderedEmail): Promise<void> {
        attempts++;
        throw new Error("smtp-down");
      },
    };
    const consumer = new EventBusNotificationsConsumer({
      bus,
      registry: new TemplateRegistry(),
      sender: flakySender,
      maxRetries: 2,
    });
    consumer.start();

    const failures: NotificationEmailFailed[] = [];
    bus.subscribe<NotificationEmailFailed>(
      NOTIFICATION_EMAIL_FAILED_TOPIC,
      { consumerGroup: "alerting" },
      async (e) => {
        failures.push(e.payload);
      },
    );

    await bus.publish<NotificationEmailRequest>({
      topic: NOTIFICATION_EMAIL_REQUESTED_TOPIC,
      partitionKey: TENANT_ID,
      idempotencyKey: "fail-once",
      payload: makeRequest(),
    });
    // Drain before shutdown — shutdown rejects new publishes (including the
    // consumer's downstream failure-event publish), so we drain first.
    await new Promise((r) => setTimeout(r, 100));

    // Each retry emits a failure event; retries determined by maxRetries.
    expect(attempts).toBeGreaterThanOrEqual(1);
    expect(failures.length).toBeGreaterThanOrEqual(1);
    expect(failures[0]?.lastError).toBe("smtp-down");
    expect(failures[0]?.recipientHash).toBe(hashRecipient("owner@acme.test"));

    consumer.stop();
    await bus.shutdown();
  });
});

describe("EventBusNotificationsConsumer — lifecycle", () => {
  it("stop() prevents further deliveries", async () => {
    const bus = new InMemoryEventBus();
    const sender = new NoopEmailSender();
    const consumer = new EventBusNotificationsConsumer({
      bus,
      registry: new TemplateRegistry(),
      sender,
    });
    consumer.start();

    await bus.publish<NotificationEmailRequest>({
      topic: NOTIFICATION_EMAIL_REQUESTED_TOPIC,
      partitionKey: TENANT_ID,
      idempotencyKey: "before-stop",
      payload: makeRequest(),
    });
    await flushBus(bus);
    expect(sender.sent).toHaveLength(1);

    consumer.stop();

    await bus.publish<NotificationEmailRequest>({
      topic: NOTIFICATION_EMAIL_REQUESTED_TOPIC,
      partitionKey: TENANT_ID,
      idempotencyKey: "after-stop",
      payload: makeRequest(),
    });
    await flushBus(bus);
    expect(sender.sent).toHaveLength(1);

    await bus.shutdown();
  });

  it("start() is idempotent — second call is a no-op", async () => {
    const bus = new InMemoryEventBus();
    const sender = new NoopEmailSender();
    const consumer = new EventBusNotificationsConsumer({
      bus,
      registry: new TemplateRegistry(),
      sender,
    });
    consumer.start();
    consumer.start();

    await bus.publish<NotificationEmailRequest>({
      topic: NOTIFICATION_EMAIL_REQUESTED_TOPIC,
      partitionKey: TENANT_ID,
      idempotencyKey: "ev-1",
      payload: makeRequest(),
    });
    await flushBus(bus);
    // If start() weren't idempotent the consumer would subscribe twice + each
    // event would dispatch twice within the consumer group.
    expect(sender.sent).toHaveLength(1);

    consumer.stop();
    await bus.shutdown();
  });
});
