/**
 * Email template helpers — plain TS functions producing `EmailMessage`.
 *
 * Adopter can override individual templates via `starter.config.ts` (v1+
 * customization slot) but the defaults are sensible.
 *
 * Templates are intentionally minimal — brand integration lands when
 * `@starter-saas/brand` (EPIC-008) hooks up.
 */

import type { EmailMessage } from "../types.js";

export interface VerificationTemplateInput {
  recipientEmail: string;
  verificationUrl: string;
  expiresInHours: number;
}

export function verificationEmail(input: VerificationTemplateInput): EmailMessage {
  const subject = "Verify your email address";
  const bodyText = `Hi,

Welcome! Please verify your email address by clicking the link below
(expires in ${input.expiresInHours} hours):

${input.verificationUrl}

If you didn't sign up, you can safely ignore this email.`;
  const bodyHtml = `<p>Hi,</p>
<p>Welcome! Please verify your email address by clicking the link below
(expires in ${input.expiresInHours} hours):</p>
<p><a href="${input.verificationUrl}">${input.verificationUrl}</a></p>
<p>If you didn't sign up, you can safely ignore this email.</p>`;
  return { to: input.recipientEmail, subject, bodyText, bodyHtml };
}

export interface MagicLinkTemplateInput {
  recipientEmail: string;
  signInUrl: string;
  expiresInMinutes: number;
}

export function magicLinkEmail(input: MagicLinkTemplateInput): EmailMessage {
  const subject = "Your sign-in link";
  const bodyText = `Hi,

Click the link below to sign in (expires in ${input.expiresInMinutes} minutes):

${input.signInUrl}

If you didn't request this, you can safely ignore this email — your
account stays unchanged.`;
  const bodyHtml = `<p>Hi,</p>
<p>Click the link below to sign in (expires in ${input.expiresInMinutes} minutes):</p>
<p><a href="${input.signInUrl}">${input.signInUrl}</a></p>
<p>If you didn't request this, you can safely ignore this email — your
account stays unchanged.</p>`;
  return { to: input.recipientEmail, subject, bodyText, bodyHtml };
}

export interface PasswordResetTemplateInput {
  recipientEmail: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function passwordResetEmail(input: PasswordResetTemplateInput): EmailMessage {
  const subject = "Reset your password";
  const bodyText = `Hi,

You (or someone using your email) requested a password reset. Use the
link below to choose a new password (expires in ${input.expiresInMinutes} minutes):

${input.resetUrl}

If you didn't request a reset, you can safely ignore this email — your
password will stay unchanged.`;
  const bodyHtml = `<p>Hi,</p>
<p>You (or someone using your email) requested a password reset. Use the
link below to choose a new password (expires in ${input.expiresInMinutes} minutes):</p>
<p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
<p>If you didn't request a reset, you can safely ignore this email — your
password will stay unchanged.</p>`;
  return { to: input.recipientEmail, subject, bodyText, bodyHtml };
}
