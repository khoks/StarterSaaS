/**
 * Kit-provided default templates — welcome, password reset, email
 * verification, tenant invitation. Adopters can override per-tenant via the
 * `notification_templates` table (see `../db/schema.ts`).
 */

import { z } from "zod";

import type { EmailTemplate } from "./types.js";

export const welcomeTemplate: EmailTemplate = {
  id: "welcome",
  variables: z.object({
    tenantName: z.string(),
    tenantSlug: z.string(),
    appUrl: z.string().url(),
  }),
  subject: "Welcome to {{tenantName}}!",
  textBody: `Hi,

Your tenant "{{tenantName}}" has been provisioned and is now active.

Sign in at: {{appUrl}}

— The StarterSaaS team
`,
};

export const passwordResetTemplate: EmailTemplate = {
  id: "password-reset",
  variables: z.object({
    resetUrl: z.string().url(),
    expiresInMinutes: z.number(),
  }),
  subject: "Reset your password",
  textBody: `A password reset was requested for your account.

Click here to set a new password (link expires in {{expiresInMinutes}} minutes):
{{resetUrl}}

If you didn't request this, you can safely ignore this email.
`,
};

export const emailVerificationTemplate: EmailTemplate = {
  id: "email-verification",
  variables: z.object({
    verifyUrl: z.string().url(),
    expiresInMinutes: z.number(),
  }),
  subject: "Verify your email address",
  textBody: `Confirm your email by clicking this link (expires in {{expiresInMinutes}} minutes):

{{verifyUrl}}
`,
};

export const tenantInvitationTemplate: EmailTemplate = {
  id: "tenant-invitation",
  variables: z.object({
    inviterName: z.string(),
    tenantName: z.string(),
    acceptUrl: z.string().url(),
    expiresInDays: z.number(),
  }),
  subject: "{{inviterName}} invited you to {{tenantName}}",
  textBody: `{{inviterName}} invited you to join the "{{tenantName}}" team.

Accept the invitation (expires in {{expiresInDays}} days):
{{acceptUrl}}
`,
};

export const DEFAULT_TEMPLATES: readonly EmailTemplate[] = [
  welcomeTemplate,
  passwordResetTemplate,
  emailVerificationTemplate,
  tenantInvitationTemplate,
];
