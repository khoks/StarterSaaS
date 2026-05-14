/**
 * Drizzle-backed `SessionResolver` adapter for the kit's `authContextPlugin`.
 *
 * Reads `platform.sessions` JOINed against `platform.users` (and optionally
 * `platform.user_tenant` for active-tenant role + joinedAt), returns a
 * `Session` per the `@starter-saas/auth` contract, or null when:
 *   - The session token isn't found
 *   - The session is expired (`expires <= now()`)
 *
 * This is the kit's reference impl for adopters using Auth.js v5 + the kit
 * schemas. Adopters using a different session store (Redis, JWT, etc.)
 * write their own `SessionResolver` implementing the same interface.
 */

import { and, eq, gt } from "drizzle-orm";

import type { Session, AuthDb } from "@starter-saas/auth";
import { schema as authSchema } from "@starter-saas/auth";
import type { SessionResolver } from "@starter-saas/gateway";

const { sessions, users, userTenant } = authSchema;

export function createDrizzleSessionResolver(db: AuthDb): SessionResolver {
  return async (token) => {
    const now = new Date();

    const rows = await db
      .select({
        sessionToken: sessions.sessionToken,
        sessionExpires: sessions.expires,
        activeTenantId: sessions.activeTenantId,
        userId: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        emailVerified: users.emailVerified,
        totpEnabled: users.totpEnabled,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.sessionToken, token), gt(sessions.expires, now)))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0]!;

    let activeTenant: Session["activeTenant"] = null;
    if (row.activeTenantId !== null) {
      const memberships = await db
        .select({
          tenantId: userTenant.tenantId,
          roleLabel: userTenant.roleLabel,
          joinedAt: userTenant.joinedAt,
        })
        .from(userTenant)
        .where(
          and(
            eq(userTenant.userId, row.userId),
            eq(userTenant.tenantId, row.activeTenantId),
          ),
        )
        .limit(1);
      const membership = memberships[0];
      if (membership) {
        activeTenant = {
          tenantId: membership.tenantId,
          roleLabel: membership.roleLabel,
          joinedAt: membership.joinedAt,
        };
      }
    }

    return {
      user: {
        id: row.userId,
        email: row.email,
        name: row.name,
        image: row.image,
        emailVerified: row.emailVerified,
        totpEnabled: row.totpEnabled,
      },
      activeTenant,
      expires: row.sessionExpires,
    };
  };
}
