/**
 * PII redactor — matcher + redact helpers + Pino path generator.
 */

import { describe, expect, it } from "vitest";

import {
  BUILTIN_REDACTED_KEYS,
  REDACTED_PLACEHOLDER,
  makeRedactionMatcher,
  pinoRedactPaths,
  redactObject,
  redactSpanAttributes,
} from "../src/index.js";

describe("makeRedactionMatcher", () => {
  it("matches built-in sensitive keys (case-insensitive)", () => {
    const m = makeRedactionMatcher();
    expect(m("password")).toBe(true);
    expect(m("Password")).toBe(true);
    expect(m("user_password")).toBe(true);
    expect(m("apiKey")).toBe(true);
    expect(m("ssn")).toBe(true);
    expect(m("Cookie")).toBe(true);
  });

  it("matches adopter-supplied extras", () => {
    const m = makeRedactionMatcher(["mySecretField", "dob"]);
    expect(m("mysecretfield")).toBe(true);
    expect(m("user_dob")).toBe(true);
  });

  it("doesn't match unrelated keys", () => {
    const m = makeRedactionMatcher();
    expect(m("tenantName")).toBe(false);
    expect(m("createdAt")).toBe(false);
    expect(m("status")).toBe(false);
  });

  it("matches `email` (intentionally aggressive)", () => {
    const m = makeRedactionMatcher();
    expect(m("email")).toBe(true);
    expect(m("userEmail")).toBe(true);
    expect(m("recipientEmail")).toBe(true);
  });
});

describe("redactObject", () => {
  it("redacts top-level sensitive keys", () => {
    const m = makeRedactionMatcher();
    const out = redactObject({ password: "secret", name: "Ada" }, m);
    expect(out.password).toBe(REDACTED_PLACEHOLDER);
    expect(out.name).toBe("Ada");
  });

  it("redacts nested keys recursively", () => {
    const m = makeRedactionMatcher();
    const out = redactObject(
      {
        user: { id: "1", apiKey: "k" },
        outer: { inner: { token: "t" } },
      },
      m,
    );
    const user = out.user as Record<string, unknown>;
    const outer = out.outer as Record<string, unknown>;
    expect(user.id).toBe("1");
    expect(user.apiKey).toBe(REDACTED_PLACEHOLDER);
    expect(((outer.inner as Record<string, unknown>).token)).toBe(REDACTED_PLACEHOLDER);
  });

  it("redacts inside arrays of objects", () => {
    const m = makeRedactionMatcher();
    const out = redactObject(
      {
        users: [
          { id: "1", password: "p1" },
          { id: "2", password: "p2" },
        ],
      },
      m,
    );
    const users = out.users as Array<Record<string, unknown>>;
    expect(users[0]?.password).toBe(REDACTED_PLACEHOLDER);
    expect(users[1]?.password).toBe(REDACTED_PLACEHOLDER);
    expect(users[0]?.id).toBe("1");
  });

  it("preserves non-sensitive structure", () => {
    const m = makeRedactionMatcher();
    const out = redactObject({ count: 5, active: true, tags: ["a", "b"] }, m);
    expect(out).toEqual({ count: 5, active: true, tags: ["a", "b"] });
  });
});

describe("redactSpanAttributes", () => {
  it("filters PII attribute keys", () => {
    const m = makeRedactionMatcher();
    const out = redactSpanAttributes(
      { "user.id": "1", "user.password": "p", "tenant.id": "t" },
      m,
    );
    expect(out["user.id"]).toBe("1");
    expect(out["user.password"]).toBe(REDACTED_PLACEHOLDER);
    expect(out["tenant.id"]).toBe("t");
  });
});

describe("pinoRedactPaths", () => {
  it("generates paths for each built-in + extra key", () => {
    const paths = pinoRedactPaths(["customSecret"]);
    expect(paths).toContain("password");
    expect(paths).toContain("*.password");
    expect(paths).toContain("*.*.password");
    expect(paths).toContain("customSecret");
    expect(paths).toContain("*.customSecret");
  });

  it("covers every built-in key", () => {
    const paths = pinoRedactPaths();
    for (const k of BUILTIN_REDACTED_KEYS) {
      expect(paths).toContain(k);
    }
  });
});
