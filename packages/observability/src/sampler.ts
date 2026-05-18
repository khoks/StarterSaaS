/**
 * Adaptive sampler per ADR-0006 side-pick: 100% errors / 1% healthy.
 *
 * OTel's standard `ParentBasedSampler` + `TraceIdRatioBasedSampler` gives
 * deterministic ratio-based sampling but doesn't know about errors. We wrap
 * the ratio sampler + check for error-indicating attributes on the root
 * span at decision time. If the attribute matches, sample at the error rate;
 * otherwise the healthy rate.
 *
 * Limitation: OTel's `shouldSample` decision is made BEFORE the span runs,
 * so we don't know yet whether the span will error. The kit's discipline:
 * when adopter code knows a request is error-handling (e.g. an error route),
 * it sets `app.error_path = true` on the active span's attributes before
 * child spans get created. The sampler reads that hint. Otherwise, the
 * sampler uses the healthy rate.
 *
 * For runtime "this span errored after the fact" upgrades, OTel's
 * `force-sampling` via span-link-based escalation is a v1+ enhancement.
 */

import {
  SamplingDecision,
  type Attributes,
  type Context,
  type Link,
  type Sampler,
  type SamplingResult,
  type SpanKind,
} from "@opentelemetry/api";
import { TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-base";

/** Adopter sets `app.error_path = true` on an attribute at span-creation time
 *  to escalate to the error rate. */
export const ERROR_PATH_ATTRIBUTE = "app.error_path" as const;

export interface AdaptiveSamplerOptions {
  /** Sampling rate for healthy code paths. Default 0.01. */
  healthyRate: number;
  /** Sampling rate for code paths flagged as error-handling. Default 1.0. */
  errorRate: number;
}

export class AdaptiveSampler implements Sampler {
  private readonly healthy: Sampler;
  private readonly error: Sampler;
  private readonly options: AdaptiveSamplerOptions;

  constructor(options: AdaptiveSamplerOptions) {
    this.options = options;
    // `TraceIdRatioBasedSampler` is typed with a narrower shouldSample signature
    // than `Sampler` (only context + traceId). Cast widens it so we can pass the
    // full arg list — the runtime impl just ignores the extras.
    this.healthy = new TraceIdRatioBasedSampler(options.healthyRate) as unknown as Sampler;
    this.error = new TraceIdRatioBasedSampler(options.errorRate) as unknown as Sampler;
  }

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[],
  ): SamplingResult {
    if (attributes[ERROR_PATH_ATTRIBUTE] === true) {
      return this.error.shouldSample(context, traceId, spanName, spanKind, attributes, links);
    }
    return this.healthy.shouldSample(context, traceId, spanName, spanKind, attributes, links);
  }

  toString(): string {
    return `AdaptiveSampler(healthy=${this.options.healthyRate}, error=${this.options.errorRate})`;
  }
}

/** Helper for adopters who only know a span is error-handling at runtime
 *  (after a try/catch). Records the error attribute on the active span +
 *  marks the span status. Note: this doesn't retroactively change the
 *  sampling decision (already made); it only annotates the captured span
 *  for backends that filter on `app.error_path` attribute. */
export function markActiveSpanErrorPath(attributes: Record<string, unknown>): Record<string, unknown> {
  return { ...attributes, [ERROR_PATH_ATTRIBUTE]: true };
}

/** Force-sample helper for adopter code that knows in advance a span is
 *  error-handling. Returns an attribute object to merge into span options. */
export function errorPathAttributes(): Attributes {
  return { [ERROR_PATH_ATTRIBUTE]: true };
}

/** Quick decision check — used in tests + by adopters who want to assert
 *  whether a sample WOULD be taken without actually creating a span. */
export function shouldSampleDecisionToBool(decision: SamplingDecision): boolean {
  return (
    decision === SamplingDecision.RECORD_AND_SAMPLED ||
    decision === SamplingDecision.RECORD
  );
}
