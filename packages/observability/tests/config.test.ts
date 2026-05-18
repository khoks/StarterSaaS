/**
 * Zod schema tests for the observability config.
 */

import { describe, expect, it } from "vitest";

import { ObservabilityConfigSchema } from "../src/index.js";

describe("ObservabilityConfigSchema", () => {
  it("supplies all defaults when given an empty object", () => {
    const parsed = ObservabilityConfigSchema.parse({});
    expect(parsed.serviceName).toBe("starter-saas");
    expect(parsed.environment).toBe("development");
    expect(parsed.sampling.healthyRate).toBe(0.01);
    expect(parsed.sampling.errorRate).toBe(1.0);
    expect(parsed.pii.enabled).toBe(true);
    expect(parsed.pii.extraRedactedKeys).toEqual([]);
    expect(parsed.llm.promptCapture).toBe("preview");
    expect(parsed.llm.promptPreviewChars).toBe(100);
    expect(parsed.retention.logsDays).toBe(30);
    expect(parsed.retention.tracesDays).toBe(7);
    expect(parsed.retention.metricsDays).toBe(90);
    expect(parsed.retention.costRollupsDays).toBe(90);
  });

  it("respects adopter overrides", () => {
    const parsed = ObservabilityConfigSchema.parse({
      serviceName: "my-app",
      serviceVersion: "1.2.3",
      environment: "production",
      sampling: { healthyRate: 0.1 },
      pii: { extraRedactedKeys: ["socialSec", "address"] },
      llm: { promptCapture: "full", promptPreviewChars: 250 },
      retention: { logsDays: 7 },
    });
    expect(parsed.serviceVersion).toBe("1.2.3");
    expect(parsed.sampling.healthyRate).toBe(0.1);
    expect(parsed.sampling.errorRate).toBe(1.0); // default preserved
    expect(parsed.pii.extraRedactedKeys).toEqual(["socialSec", "address"]);
    expect(parsed.llm.promptCapture).toBe("full");
    expect(parsed.retention.logsDays).toBe(7);
    expect(parsed.retention.tracesDays).toBe(7); // default preserved
  });

  it("rejects sampling rates outside [0, 1]", () => {
    expect(() =>
      ObservabilityConfigSchema.parse({ sampling: { healthyRate: 1.5 } }),
    ).toThrow();
    expect(() =>
      ObservabilityConfigSchema.parse({ sampling: { errorRate: -0.1 } }),
    ).toThrow();
  });

  it("rejects retention days < 1", () => {
    expect(() =>
      ObservabilityConfigSchema.parse({ retention: { logsDays: 0 } }),
    ).toThrow();
  });

  it("rejects unknown llm.promptCapture values", () => {
    expect(() =>
      ObservabilityConfigSchema.parse({ llm: { promptCapture: "evil" } }),
    ).toThrow();
  });
});
