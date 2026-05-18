/**
 * Notification + email contracts — Zod-validated at every boundary (D-25).
 *
 * MVP-1 supports email only; SMS / push / WhatsApp adapters slated v1+.
 *
 * Notification flow:
 *   1. Producer publishes `notification.email_requested` to the bus
 *      (envelope payload = NotificationEmailRequestPayload)
 *   2. EventBusNotificationsConsumer subscribes, renders the template, sends
 *      via the configured EmailSender
 *   3. (v1+) Adopter can subscribe additional consumers for SMS / push / etc.
 *      off the same NotificationRequested topic.
 */

import { z } from "zod";

/** Built-in template IDs ship with the kit. Adopters register additional IDs
 *  via `TemplateRegistry.register(...)`. */
export const KIT_TEMPLATE_IDS = [
  "welcome",
  "password-reset",
  "email-verification",
  "tenant-invitation",
] as const;

export type KitTemplateId = (typeof KIT_TEMPLATE_IDS)[number];

export const EmailRecipientSchema = z.object({
  email: z.string().email(),
  /** Human-readable name; used for the `To: "Name" <email>` header. */
  name: z.string().optional(),
});
export type EmailRecipient = z.infer<typeof EmailRecipientSchema>;

/** A request to send one email. Adopter producers publish this as the bus
 *  event payload on the `notification.email_requested` topic. */
export const NotificationEmailRequestSchema = z.object({
  /** Tenant scope — used for per-tenant template lookup. Null for cross-tenant
   *  / platform-admin emails. */
  tenantId: z.string().uuid().nullable(),
  /** Template ID — built-in (`KIT_TEMPLATE_IDS`) or adopter-registered. */
  templateId: z.string().min(1),
  /** Variables substituted into the template (e.g. `{{tenantName}}`). */
  variables: z.record(z.union([z.string(), z.number(), z.boolean()])),
  /** Recipient. */
  to: EmailRecipientSchema,
  /** Optional reply-to override. */
  replyTo: EmailRecipientSchema.optional(),
});
export type NotificationEmailRequest = z.infer<typeof NotificationEmailRequestSchema>;

/** A rendered email ready to ship via the EmailSender. Produced by the
 *  TemplateRegistry from a NotificationEmailRequest. */
export const RenderedEmailSchema = z.object({
  to: EmailRecipientSchema,
  replyTo: EmailRecipientSchema.optional(),
  subject: z.string().min(1),
  textBody: z.string(),
  /** HTML body — optional; senders that don't support HTML fall back to text. */
  htmlBody: z.string().optional(),
  /** Diagnostic fields — surfaced in observability + the audit log. */
  templateId: z.string(),
  tenantId: z.string().uuid().nullable(),
});
export type RenderedEmail = z.infer<typeof RenderedEmailSchema>;

/** Topic + idempotency-key conventions for notification events. Same Kafka-
 *  shaped envelope as the rest of the bus — partitionKey = tenantId (or "_global"
 *  for cross-tenant) so emails for one tenant process in order. */
export const NOTIFICATION_EMAIL_REQUESTED_TOPIC = "notification.email_requested" as const;
export const NOTIFICATION_EMAIL_SENT_TOPIC = "notification.email_sent" as const;
export const NOTIFICATION_EMAIL_FAILED_TOPIC = "notification.email_failed" as const;

/** Audit event emitted after a successful delivery — adopters subscribe to
 *  this in observability dashboards. */
export const NotificationEmailSentSchema = z.object({
  templateId: z.string(),
  tenantId: z.string().uuid().nullable(),
  recipientHash: z.string(), // PII-scrubbed
  sentAt: z.date(),
});
export type NotificationEmailSent = z.infer<typeof NotificationEmailSentSchema>;

/** Audit event emitted when delivery fails permanently (after retries → DLQ). */
export const NotificationEmailFailedSchema = z.object({
  templateId: z.string(),
  tenantId: z.string().uuid().nullable(),
  recipientHash: z.string(),
  lastError: z.string(),
  failedAt: z.date(),
});
export type NotificationEmailFailed = z.infer<typeof NotificationEmailFailedSchema>;
