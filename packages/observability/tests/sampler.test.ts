/**
 * AdaptiveSampler — routes to error rate when `app.error_path = true`,
 * healthy rate otherwise. Uses TraceIdRatioBasedSampler-derived determinism
 * so we can assert sampled-or-not for specific traceIds.
 */

import { ROOT_CONTEXT, SamplingDecision, SpanKind } from "@opentelemetry/api";
import { describe, expect, it } from "vitest";

import {
  AdaptiveSampler,
  ERROR_PATH_ATTRIBUTE,
  errorPathAttributes,
  shouldSampleDecisionToBool,
} from "../src/index.js";

describe("AdaptiveSampler", () => {
  it("samples 100% with errorRate=1 + error path", () => {
    const sampler = new AdaptiveSampler({ healthyRate: 0, errorRate: 1.0 });
    const decision = sampler.shouldSample(
      ROOT_CONTEXT,
      "00000000000000000000000000000001",
      "test-span",
      SpanKind.INTERNAL,
      { [ERROR_PATH_ATTRIBUTE]: true },
      [],
    );
    expect(decision.decision).toBe(SamplingDecision.RECORD_AND_SAMPLED);
    expect(shouldSampleDecisionToBool(decision.decision)).toBe(true);
  });

  it("samples 0% with healthyRate=0 + healthy path", () => {
    const sampler = new AdaptiveSampler({ healthyRate: 0, errorRate: 1.0 });
    const decision = sampler.shouldSample(
      ROOT_CONTEXT,
      "00000000000000000000000000000001",
      "test-span",
      SpanKind.INTERNAL,
      {},
      [],
    );
    expect(decision.decision).toBe(SamplingDecision.NOT_RECORD);
    expect(shouldSampleDecisionToBool(decision.decision)).toBe(false);
  });

  it("respects errorRate < 1 — some error spans sampled, some not", () => {
    const sampler = new AdaptiveSampler({ healthyRate: 0, errorRate: 0.5 });
    let sampled = 0;
    for (let i = 0; i < 256; i++) {
      // TraceIdRatioBasedSampler reads the FIRST 8 bytes of the trace ID.
      // Distinct values must vary the leading bytes (not trailing). We use
      // a non-uniform byte-permutation pattern so we cover the full range.
      const hi = ((i * 0x9e3779b9) >>> 0).toString(16).padStart(8, "0");
      const traceId = hi + "0".repeat(24);
      const d = sampler.shouldSample(
        ROOT_CONTEXT,
        traceId,
        "s",
        SpanKind.INTERNAL,
        { [ERROR_PATH_ATTRIBUTE]: true },
        [],
      );
      if (shouldSampleDecisionToBool(d.decision)) sampled++;
    }
    // ~50% of 256 trace IDs sampled — non-trivial fraction in both halves.
    expect(sampled).toBeGreaterThan(50);
    expect(sampled).toBeLessThan(200);
  });

  it("toString carries both rates for diagnostics", () => {
    const sampler = new AdaptiveSampler({ healthyRate: 0.01, errorRate: 1 });
    expect(sampler.toString()).toBe("AdaptiveSampler(healthy=0.01, error=1)");
  });
});

describe("errorPathAttributes helper", () => {
  it("returns the app.error_path attribute set to true", () => {
    expect(errorPathAttributes()).toEqual({ [ERROR_PATH_ATTRIBUTE]: true });
  });
});
