/**
 * Tenant schema-name formatting + validation.
 *
 * Per ADR-0004 §3 side-picks: schema name = `tenant_{uuid}` literal. Postgres
 * identifiers can contain hyphens only when quoted; we strip hyphens from the
 * UUID and use underscores so the identifier is bare-safe ("tenant_abc...def").
 * Stripping hyphens preserves the full 32-hex-char entropy + sortability of
 * UUIDv7 (the prefix is still the time-ordered portion).
 */

/** Length of a UUID with hyphens stripped (32 hex chars). */
const HEX_LEN = 32;
const SCHEMA_NAME_REGEX = /^tenant_[a-f0-9]{32}$/;

/** Format a tenant UUID into the Postgres schema-name literal. */
export function tenantSchemaName(tenantId: string): string {
  const hex = tenantId.replace(/-/g, "").toLowerCase();
  if (hex.length !== HEX_LEN || !/^[a-f0-9]+$/.test(hex)) {
    throw new Error(
      `tenantSchemaName: expected a UUID (with or without hyphens); got "${tenantId}"`,
    );
  }
  return `tenant_${hex}`;
}

/** True if the given string is a well-formed tenant schema name. */
export function isTenantSchemaName(name: string): boolean {
  return SCHEMA_NAME_REGEX.test(name);
}
