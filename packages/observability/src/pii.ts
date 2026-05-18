/**
 * PII redactor per ADR-0006 — built-in sensitive-key patterns + adopter
 * extensions. Used both as a Pino redactor (key-path-based) and as an OTel
 * span attribute filter (key-name-based).
 *
 * Detection: case-insensitive substring match against the canonical attribute
 * key. Matched values are replaced with `"[REDACTED]"` (string) for
 * string-typed inputs; non-string types (number, boolean, object) are
 * shallow-replaced with the same sentinel string for log output.
 *
 * Built-in sensitive-key patterns are intentionally broad — adopters narrow
 * via the kit's PII-test discipline. Better to over-redact than to leak.
 */

/** Built-in case-insensitive substrings that mark an attribute as PII. */
export const BUILTIN_REDACTED_KEYS: readonly string[] = [
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "session",
  "ssn",
  "credit_card",
  "creditcard",
  "card_number",
  "cardnumber",
  "cvv",
  "phone",
  "phone_number",
  "email", // matches "email", "user_email", etc; intentionally aggressive
];

export const REDACTED_PLACEHOLDER = "[REDACTED]" as const;

/** Compile an aggregate matcher from built-ins + adopter extras. */
export function makeRedactionMatcher(
  extras: readonly string[] = [],
): (key: string) => boolean {
  const lowered = [...BUILTIN_REDACTED_KEYS, ...extras].map((k) =>
    k.toLowerCase(),
  );
  return (key: string) => {
    const hay = key.toLowerCase();
    for (const needle of lowered) {
      if (hay.includes(needle)) return true;
    }
    return false;
  };
}

/** Redact a plain object's PII keys recursively. Returns a new object;
 *  the input is not mutated. */
export function redactObject<T extends Record<string, unknown>>(
  obj: T,
  matcher: (key: string) => boolean,
): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (matcher(k)) {
      out[k] = REDACTED_PLACEHOLDER;
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = redactObject(v as Record<string, unknown>, matcher);
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? redactObject(item as Record<string, unknown>, matcher)
          : item,
      );
      continue;
    }
    out[k] = v;
  }
  return out as T;
}

/** Build Pino's `redact.paths` directive list. Pino uses dot-paths
 *  (`a.b.c` or `*` glob). We expand kit + extra keys into a permissive
 *  glob: `*.<key>` matches one level + `<key>` matches root. Pino's redactor
 *  walks all keys; matching paths get redacted.
 *
 *  For full-tree redaction, the recommended adopter pattern is to install
 *  this list on the root Pino logger; deeper nested keys are still caught by
 *  the OTel-side attribute filter below. */
export function pinoRedactPaths(extras: readonly string[] = []): string[] {
  const keys = [...BUILTIN_REDACTED_KEYS, ...extras];
  const paths: string[] = [];
  for (const k of keys) {
    paths.push(k);
    paths.push(`*.${k}`);
    paths.push(`*.*.${k}`);
  }
  return paths;
}

/** Filter OTel span attributes — drops any attribute whose key matches the
 *  redaction matcher. Returns a new attribute object. */
export function redactSpanAttributes(
  attributes: Readonly<Record<string, unknown>>,
  matcher: (key: string) => boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attributes)) {
    if (matcher(k)) {
      out[k] = REDACTED_PLACEHOLDER;
    } else {
      out[k] = v;
    }
  }
  return out;
}
