/**
 * `EventBusNotificationsSender` — concrete impl of the saga step 9
 * `NotificationsSender` port from `@starter-saas/tenancy/provisioning`.
 *
 * Instead of synchronously calling an email provider from inside the saga
 * (which couples saga step duration to email provider latency), this impl
 * publishes a `notification.email_requested` event to the bus. The
 * `EventBusNotificationsConsumer` then renders + dispatches asynchronously.
 *
 * Adopter wiring:
 *
 *     const notifications = new EventBusNotificationsSender(bus, {
 *       appUrl: "https://app.example.com",
 *     });
 *     const deps: ProvisioningDeps = {
 *       // ...
 *       notifications,
 *     };
 */

import type { EventBus } from "@starter-saas/event-bus";

import {
  NOTIFICATION_EMAIL_REQUESTED_TOPIC,
  type NotificationEmailRequest,
} from "./contracts.js";

/** Mirrors the `NotificationsSender` port from `@starter-saas/tenancy` —
 *  duplicated here as a structural interface so notifications doesn't depend
 *  on tenancy. (Adopters use this with their `ProvisioningDeps` via the
 *  shared structural shape; TypeScript checks compatibility at the call site.) */
export interface NotificationsSenderPort {
  sendWelcomeEmail(args: {
    tenantId: string;
    ownerId: string;
    tenantName: string;
    tenantSlug: string;
  }): Promise<void>;
}

export interface EventBusNotificationsSenderOptions {
  /** Absolute URL of the adopter's app — substituted into the welcome
   *  template's `{{appUrl}}` variable. */
  appUrl: string;
  /** Adopter-provided lookup: given an owner UUID, return their email +
   *  display name. Typically calls `@starter-saas/auth`'s session/user
   *  store; deferred to adopter to avoid an auth → notifications dep. */
  resolveRecipient(args: {
    ownerId: string;
  }): Promise<{ email: string; name?: string }>;
}

export class EventBusNotificationsSender implements NotificationsSenderPort {
  constructor(
    private readonly bus: EventBus,
    private readonly options: EventBusNotificationsSenderOptions,
  ) {}

  async sendWelcomeEmail(args: {
    tenantId: string;
    ownerId: string;
    tenantName: string;
    tenantSlug: string;
  }): Promise<void> {
    const recipient = await this.options.resolveRecipient({ ownerId: args.ownerId });
    const request: NotificationEmailRequest = {
      tenantId: args.tenantId,
      templateId: "welcome",
      to: {
        email: recipient.email,
        ...(recipient.name !== undefined ? { name: recipient.name } : {}),
      },
      variables: {
        tenantName: args.tenantName,
        tenantSlug: args.tenantSlug,
        appUrl: this.options.appUrl,
      },
    };
    await this.bus.publish<NotificationEmailRequest>({
      topic: NOTIFICATION_EMAIL_REQUESTED_TOPIC,
      partitionKey: args.tenantId,
      idempotencyKey: `notifications:tenant-welcome:${args.tenantId}`,
      payload: request,
    });
  }
}
