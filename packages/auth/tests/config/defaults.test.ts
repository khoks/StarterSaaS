import { describe, expect, it } from "vitest";

import { defaultAuthConfig } from "../../src/config/defaults.js";

describe("defaultAuthConfig", () => {
  it("matches ADR-0007 / D-48 defaults", () => {
    expect(defaultAuthConfig.sessionLifetime.rollingDays).toBe(30);
    expect(defaultAuthConfig.sessionLifetime.idleDays).toBe(7);
    expect(defaultAuthConfig.passwordPolicy.minLength).toBe(12);
    expect(defaultAuthConfig.passwordPolicy.bcryptCost).toBe(12);
    expect(defaultAuthConfig.passwordPolicy.hibpCheck).toBe(false);
    expect(defaultAuthConfig.requireEmailVerification).toBe(true);
    expect(defaultAuthConfig.accountLockoutThreshold).toBe(5);
    expect(defaultAuthConfig.accountLockoutMinutes).toBe(15);
  });
});
