/**
 * EventBusNotificationsSender — saga step 9 adapter that publishes events
 * instead of blocking the saga on email delivery.
 */

import { describe, expect, it } from "vitest";

import { InMemoryEventBus } from "@starter-saas/event-bus";

import {
  EventBusNotificationsSender,
  NOTIFICATION_EMAIL_REQUESTED_TOPIC,
  type NotificationEmailRequest,
} from "../src/index.js";

describe("EventBusNotificationsSender.sendWelcomeEmail", () => {
  it("publishes notification.email_requested with the welcome template + tenant context", async () => {
    const bus = new InMemoryEventBus();
    const received: Array<{ payload: NotificationEmailRequest; partitionKey: string }> =
      [];
    bus.subscribe<NotificationEmailRequest>(
      NOTIFICATION_EMAIL_REQUESTED_TOPIC,
      { consumerGroup: "observer" },
      async (event) => {
        received.push({ payload: event.payload, partitionKey: event.partitionKey });
      },
    );

    const notifier = new EventBusNotificationsSender(bus, {
      appUrl: "https://app.example.com",
      async resolveRecipient({ ownerId }) {
        return { email: `${ownerId}@example.test`, name: "Owner" };
      },
    });
    await notifier.sendWelcomeEmail({
      tenantId: "01900000-0000-7000-8000-000000000001",
      ownerId: "00000000-0000-0000-0000-000000000099",
      tenantName: "Acme",
      tenantSlug: "acme",
    });

    await bus.shutdown();
    expect(received).toHaveLength(1);
    expect(received[0]?.payload.templateId).toBe("welcome");
    expect(received[0]?.payload.tenantId).toBe("01900000-0000-7000-8000-000000000001");
    expect(received[0]?.payload.variables.tenantName).toBe("Acme");
    expect(received[0]?.payload.variables.tenantSlug).toBe("acme");
    expect(received[0]?.payload.variables.appUrl).toBe("https://app.example.com");
    expect(received[0]?.payload.to.email).toBe(
      "00000000-0000-0000-0000-000000000099@example.test",
    );
    // partitionKey = tenantId ensures per-tenant email ordering
    expect(received[0]?.partitionKey).toBe("01900000-0000-7000-8000-000000000001");
  });

  it("uses a stable idempotencyKey so the pg-outbox bus can dedupe at the consumer", async () => {
    const bus = new InMemoryEventBus();
    const observedKeys: string[] = [];
    bus.subscribe<NotificationEmailRequest>(
      NOTIFICATION_EMAIL_REQUESTED_TOPIC,
      { consumerGroup: "observer" },
      async (event) => {
        observedKeys.push(event.idempotencyKey);
      },
    );

    const notifier = new EventBusNotificationsSender(bus, {
      appUrl: "https://app.example.com",
      async resolveRecipient() {
        return { email: "owner@x.test" };
      },
    });
    for (let i = 0; i < 3; i++) {
      await notifier.sendWelcomeEmail({
        tenantId: "01900000-0000-7000-8000-000000000001",
        ownerId: "x",
        tenantName: "N",
        tenantSlug: "s",
      });
    }
    await bus.shutdown();
    // Producer discipline: every retry carries the SAME idempotencyKey. The
    // pg-outbox `event_dedupe` table provides true dedupe at the consumer
    // (verified in STORY-017 sub-PR #1 integration tests). InMemoryEventBus
    // doesn't dedupe — it delivers at-least-once.
    expect(observedKeys).toHaveLength(3);
    expect(new Set(observedKeys).size).toBe(1);
    expect(observedKeys[0]).toBe(
      "notifications:tenant-welcome:01900000-0000-7000-8000-000000000001",
    );
  });
});
