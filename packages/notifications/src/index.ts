/**
 * @starter-saas/notifications — pluggable email + template subsystem per
 * STORY-018 / ADR-0005 / ADR-0006.
 *
 * Public surface:
 *   - `EmailSender` contract + `ConsoleEmailSender` + `NoopEmailSender`
 *   - `TemplateRegistry` + 4 kit-default templates (welcome / password-reset /
 *     email-verification / tenant-invitation) + per-tenant override hook
 *   - `EventBusNotificationsConsumer` — bus-driven async delivery
 *   - `EventBusNotificationsSender` — saga step 9 port impl (publishes events)
 *   - `NOTIFICATIONS_MIGRATION` — per-tenant `notification_templates` DDL
 *   - PII scrubbing helpers (`hashRecipient`, `maskRecipient`)
 *
 * SMS / push / WhatsApp adapters slated v1+ — they reuse the same bus topic
 * pattern (`notification.sms_requested`, etc.).
 */

export const PACKAGE_NAME = "@starter-saas/notifications" as const;

export * from "./contracts.js";
export * from "./email/index.js";
export * from "./templates/index.js";
export {
  EventBusNotificationsConsumer,
  type EventBusNotificationsConsumerOptions,
} from "./consumer.js";
export {
  EventBusNotificationsSender,
  type EventBusNotificationsSenderOptions,
  type NotificationsSenderPort,
} from "./saga-adapter.js";
export {
  NOTIFICATIONS_MIGRATION,
  NOTIFICATIONS_MIGRATION_ID,
  type NotificationsTenantMigration,
} from "./db/schema.js";
export { hashRecipient, maskRecipient } from "./pii.js";
