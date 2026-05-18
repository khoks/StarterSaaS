/**
 * Full end-to-end integration: provisioning saga step 9
 *   → `EventBusNotificationsSender` publishes `notification.email_requested`
 *   → `EventBusNotificationsConsumer` renders + dispatches via `NoopEmailSender`
 *   → `notification.email_sent` audit event fires with PII-hashed recipient
 *
 * Exercises the contract path STORY-018 closes: saga is decoupled from email
 * provider latency; email delivery is async via the bus; audit + PII discipline
 * preserved across the whole flow.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { InMemoryEventBus } from "@starter-saas/event-bus";
import {
  EventBusNotificationsConsumer,
  EventBusNotificationsSender,
  NOTIFICATION_EMAIL_SENT_TOPIC,
  NoopEmailSender,
  TemplateRegistry,
  hashRecipient,
  type NotificationEmailSent,
} from "@starter-saas/notifications";
import { SagaRunner } from "@starter-saas/saga";

import {
  DrizzleSagaStore,
  DrizzleSchemaManager,
  DrizzleTenantMigrator,
  DrizzleTenantRegistry,
  noopBillingRegistry,
  noopSecretsProvider,
  noopTenantSeeder,
  runTenantProvisioning,
  type CreateTenantInput,
  type ProvisioningDeps,
} from "../../src/index.js";
import { createTestDb, type TestDb } from "../../src/testing/index.js";

const VALID_INPUT: CreateTenantInput = {
  name: "Acme Corporation",
  slug: "acme-corp",
  plan: "free",
  ownerId: "00000000-0000-0000-0000-000000000001",
};

const KIT_MIGRATIONS = [
  {
    id: "0001_create_users",
    sql: `CREATE TABLE users (id uuid PRIMARY KEY, email text NOT NULL)`,
  },
];

describe("Provisioning saga → notifications consumer end-to-end", () => {
  let harness: TestDb;
  let bus: InMemoryEventBus;
  let sender: NoopEmailSender;
  let consumer: EventBusNotificationsConsumer;

  beforeEach(async () => {
    harness = await createTestDb();
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
    await harness.close();
  });

  it("provisioning succeeds + welcome email is dispatched + audit event fires", async () => {
    const auditEvents: NotificationEmailSent[] = [];
    bus.subscribe<NotificationEmailSent>(
      NOTIFICATION_EMAIL_SENT_TOPIC,
      { consumerGroup: "audit" },
      async (event) => {
        auditEvents.push(event.payload);
      },
    );

    const notifications = new EventBusNotificationsSender(bus, {
      appUrl: "https://app.example.com",
      // eslint-disable-next-line @typescript-eslint/require-await
      async resolveRecipient({ ownerId }) {
        return { email: `${ownerId}@example.test`, name: "Owner" };
      },
    });

    const deps: ProvisioningDeps = {
      registry: new DrizzleTenantRegistry(harness.db),
      schemaManager: new DrizzleSchemaManager(harness.db),
      migrator: new DrizzleTenantMigrator(harness.db, KIT_MIGRATIONS),
      seeder: noopTenantSeeder,
      secretsProvider: noopSecretsProvider,
      billingRegistry: noopBillingRegistry,
      notifications,
      eventBus: bus,
    };
    const runner = new SagaRunner(new DrizzleSagaStore(harness.db));
    const result = await runTenantProvisioning(runner, deps, VALID_INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Drain the bus so the consumer's handler chain completes (including the
    // audit event publish).
    await new Promise((r) => setTimeout(r, 100));

    // The notifications consumer rendered + sent the welcome email.
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]?.subject).toBe("Welcome to Acme Corporation!");
    expect(sender.sent[0]?.templateId).toBe("welcome");
    expect(sender.sent[0]?.tenantId).toBe(result.finalState.tenantId);
    expect(sender.sent[0]?.textBody).toContain("https://app.example.com");
    expect(sender.sent[0]?.to.email).toBe(
      `${VALID_INPUT.ownerId}@example.test`,
    );

    // The audit event fired with a PII-hashed recipient (NOT the plain email).
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]?.templateId).toBe("welcome");
    expect(auditEvents[0]?.tenantId).toBe(result.finalState.tenantId);
    expect(auditEvents[0]?.recipientHash).toBe(
      hashRecipient(`${VALID_INPUT.ownerId}@example.test`),
    );
    expect(JSON.stringify(auditEvents[0])).not.toContain("@example.test");
  });
});
