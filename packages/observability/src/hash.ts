/**
 * Hash helper for PII-safe content fingerprinting. Used by `recordPrompt`
 * to attach a deterministic content hash without storing the prompt itself.
 *
 * Same shape as `@starter-saas/notifications/hashRecipient` — short SHA-256
 * digest, 16 hex chars (~64 bits of entropy; collision-resistant in practice
 * for the cardinalities the kit sees). Kept local to avoid a notifications
 * dep from observability.
 */

import { createHash } from "node:crypto";

export function hashRecipient(value: string): string {
  return createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}
