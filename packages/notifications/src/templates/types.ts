/**
 * Template definition + rendering types.
 *
 * Adopters provide one `EmailTemplate` per template ID. Each carries a Zod
 * schema for the variables it expects + render functions for subject + body.
 *
 * Variable substitution uses `{{variableName}}` syntax (Handlebars-style,
 * but kit ships a minimal implementation — no helpers, no conditionals).
 * For richer templates adopters wire Handlebars / Liquid / Pug as their
 * own template impl (just write a class that satisfies this interface).
 */

import type { z } from "zod";

export interface EmailTemplate<VarsSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  id: string;
  /** Zod schema validates the variables supplied at render time. */
  variables: VarsSchema;
  /** Subject line — supports `{{var}}` substitution. */
  subject: string;
  /** Plain-text body — supports `{{var}}` substitution. */
  textBody: string;
  /** Optional HTML body — supports `{{var}}` substitution. */
  htmlBody?: string;
  /** Default reply-to for this template — overrideable per-request. */
  defaultReplyTo?: { email: string; name?: string };
}

/** Per-tenant template override row. */
export interface TenantTemplateOverride {
  tenantId: string;
  templateId: string;
  subject: string;
  textBody: string;
  htmlBody: string | null;
}
