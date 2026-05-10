/**
 * Default AuthConfig values per ADR-0007 / D-48.
 *
 * Adopter overrides individual fields in `starter.config.ts`. This module
 * exports the canonical defaults so an adopter's config can spread + override:
 *
 *   const config: AuthConfig = { ...defaultAuthConfig, baseUrl: "https://..." };
 */

import type { AuthConfig } from "../types.js";

export const defaultAuthConfig: AuthConfig = {
  baseUrl: "http://localhost:3000",
  sessionLifetime: {
    rollingDays: 30,
    idleDays: 7,
  },
  passwordPolicy: {
    minLength: 12,
    bcryptCost: 12,
    hibpCheck: false,
  },
  requireEmailVerification: true,
  accountLockoutThreshold: 5,
  accountLockoutMinutes: 15,
};
