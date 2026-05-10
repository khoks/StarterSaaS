/**
 * User-facing input contracts — Zod-validated at HTTP boundaries (per D-25).
 *
 * Password policy (per ADR-0007 / D-48): bcrypt cost 12, 12-char minimum.
 * Breach check via HIBP k-anonymity is opt-in (configured in starter.config.ts).
 */

import { z } from "zod";

/** Min length per ADR-0007 (D-48). */
const MIN_PASSWORD_LENGTH = 12;

export const PasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);

// Trim + lowercase BEFORE email-format validation: Zod's .email() rejects
// leading/trailing whitespace, so transform must happen first via .pipe().
export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email());

export const SignUpInputSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().trim().min(1).max(200).nullable().default(null),
});

export const SignInInputSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1),
  /** Optional TOTP code when 2FA is enabled for this user. */
  totpCode: z
    .string()
    .regex(/^\d{6}$/, "TOTP code must be 6 digits")
    .optional(),
});

export const PasswordResetRequestSchema = z.object({
  email: EmailSchema,
});

export const PasswordResetCompleteSchema = z.object({
  token: z.string().min(1),
  newPassword: PasswordSchema,
});

export const MagicLinkRequestSchema = z.object({
  email: EmailSchema,
});

export type SignUpInput = z.infer<typeof SignUpInputSchema>;
export type SignInInput = z.infer<typeof SignInInputSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordResetComplete = z.infer<typeof PasswordResetCompleteSchema>;
export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;
