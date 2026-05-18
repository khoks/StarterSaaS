/**
 * `EventBusNotificationsConsumer` — subscribes to the
 * `notification.email_requested` topic on the bus, renders the request via
 * the configured `TemplateRegistry`, sends via the configured `EmailSender`,
 * then emits `notification.email_sent` (success) or `notification.email_failed`
 * (after retries → DLQ; the consumer just throws + the bus's retry/DLQ
 * machinery handles the rest).
 *
 * Adopter usage:
 *
 *     const consumer = new EventBusNotificationsConsumer({
 *       bus, registry, sender,
 *       consumerGroup: "notifications-email",
 *     });
 *     consumer.start();
 *
 * The consumer is a single in-process subscription — for multi-process LB,
 * the underlying bus (e.g. native Kafka v1+) handles it via group LB.
 */

import type { EventBus, Subscription } from "@starter-saas/event-bus";

import {
  NOTIFICATION_EMAIL_FAILED_TOPIC,
  NOTIFICATION_EMAIL_REQUESTED_TOPIC,
  NOTIFICATION_EMAIL_SENT_TOPIC,
  NotificationEmailRequestSchema,
  type NotificationEmailFailed,
  type NotificationEmailRequest,
  type NotificationEmailSent,
} from "./contracts.js";
import type { EmailSender } from "./email/types.js";
import { hashRecipient } from "./pii.js";
import type { TemplateRegistry } from "./templates/registry.js";

export interface EventBusNotificationsConsumerOptions {
  bus: EventBus;
  registry: TemplateRegistry;
  sender: EmailSender;
  /** Consumer group — distinct group means an additional independent
   *  delivery (used to fan out to e.g. analytics + email). Default
   *  "notifications-email". */
  consumerGroup?: string;
  /** Override max retries before DLQ. Default uses the bus's default. */
  maxRetries?: number;
}

export class EventBusNotificationsConsumer {
  private subscription: Subscription | null = null;
  private readonly consumerGroup: string;

  constructor(private readonly options: EventBusNotificationsConsumerOptions) {
    this.consumerGroup = options.consumerGroup ?? "notifications-email";
  }

  /** Begin consuming. Idempotent — second `start()` is a no-op. */
  start(): void {
    if (this.subscription) return;
    this.subscription = this.options.bus.subscribe<NotificationEmailRequest>(
      NOTIFICATION_EMAIL_REQUESTED_TOPIC,
      {
        consumerGroup: this.consumerGroup,
        ...(this.options.maxRetries !== undefined
          ? { maxRetries: this.options.maxRetries }
          : {}),
      },
      async (event) => {
        // Defensive Zod parse — protects against schema drift across producers.
        const request = NotificationEmailRequestSchema.parse(event.payload);
        try {
          const rendered = await this.options.registry.render(request);
          await this.options.sender.send(rendered);

          const sentPayload: NotificationEmailSent = {
            templateId: request.templateId,
            tenantId: request.tenantId,
            recipientHash: hashRecipient(request.to.email),
            sentAt: new Date(),
          };
          await this.options.bus.publish<NotificationEmailSent>({
            topic: NOTIFICATION_EMAIL_SENT_TOPIC,
            partitionKey: request.tenantId ?? "_global",
            idempotencyKey: `${event.idempotencyKey}:sent`,
            payload: sentPayload,
          });
        } catch (err) {
          // Emit the failure event so observability can capture it.
          // The throw also signals the bus to retry → DLQ this event.
          const failedPayload: NotificationEmailFailed = {
            templateId: request.templateId,
            tenantId: request.tenantId,
            recipientHash: hashRecipient(request.to.email),
            lastError: err instanceof Error ? err.message : String(err),
            failedAt: new Date(),
          };
          try {
            await this.options.bus.publish<NotificationEmailFailed>({
              topic: NOTIFICATION_EMAIL_FAILED_TOPIC,
              partitionKey: request.tenantId ?? "_global",
              idempotencyKey: `${event.idempotencyKey}:failed:${Date.now()}`,
              payload: failedPayload,
            });
          } catch {
            // Swallow secondary error — primary error surfaces via the throw.
          }
          throw err;
        }
      },
    );
  }

  /** Stop consuming. The bus's retry/DLQ machinery continues to operate on
   *  any in-flight messages already picked up by `tick()`/poll loops. */
  stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }
}
