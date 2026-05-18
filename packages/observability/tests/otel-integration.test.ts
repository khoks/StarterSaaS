/**
 * OTel SDK + GenAI span helpers + tenant context — full integration.
 *
 * Bootstraps the SDK ONCE at module load (the global tracer provider is
 * process-wide singleton; shutting it down between tests leaves OTel in an
 * undefined state where new spans no-op). Tests reset captured spans
 * between assertions instead.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  GEN_AI_ATTRIBUTES,
  ObservabilityConfigSchema,
  TenantContextSpanProcessor,
  bootstrapObservability,
  getCapturedSpans,
  recordGenAiUsage,
  recordPrompt,
  resetCapturedSpans,
  shutdownObservability,
  withGenAiSpan,
  withTenantContext,
} from "../src/index.js";

beforeAll(() => {
  bootstrapObservability(
    ObservabilityConfigSchema.parse({
      serviceName: "observability-test",
      sampling: { healthyRate: 1.0, errorRate: 1.0 }, // sample everything for tests
    }),
  );
});

afterAll(async () => {
  await shutdownObservability();
});

beforeEach(() => {
  resetCapturedSpans();
});

describe("bootstrapObservability + GenAI spans", () => {
  it("captures a GenAI span with the kit's semconv attributes", async () => {
    await withGenAiSpan(
      {
        system: "anthropic",
        requestModel: "claude-opus-4-7",
        tenantId: "01900000-0000-7000-8000-00000000000a",
        featureId: "chat",
      },
      async (span) => {
        recordGenAiUsage(span, {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 20,
          costUsd: 0.0021,
          responseId: "resp-abc",
          responseModel: "claude-opus-4-7-2026-04-01",
          finishReasons: ["end_turn"],
        });
        return undefined;
      },
    );

    const spans = getCapturedSpans();
    expect(spans).toHaveLength(1);
    const attrs = spans[0]!.attributes;
    expect(attrs[GEN_AI_ATTRIBUTES.SYSTEM]).toBe("anthropic");
    expect(attrs[GEN_AI_ATTRIBUTES.REQUEST_MODEL]).toBe("claude-opus-4-7");
    expect(attrs[GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS]).toBe(100);
    expect(attrs[GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS]).toBe(50);
    expect(attrs[GEN_AI_ATTRIBUTES.USAGE_CACHE_READ_TOKENS]).toBe(20);
    expect(attrs[GEN_AI_ATTRIBUTES.COST_USD]).toBe(0.0021);
    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_ID]).toBe("resp-abc");
    expect(attrs[GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS]).toEqual(["end_turn"]);
    expect(attrs["tenant.id"]).toBe("01900000-0000-7000-8000-00000000000a");
    expect(attrs["app.feature_id"]).toBe("chat");
  });

  it("records prompt in preview mode by default — head + tail + hash, no full content", async () => {
    const longPrompt = "x".repeat(50) + "PRIVATE_DATA_HERE" + "y".repeat(50);
    await withGenAiSpan(
      { system: "anthropic", requestModel: "claude-opus-4-7" },
      async (span) => {
        recordPrompt(span, longPrompt, { mode: "preview", previewChars: 30 });
        return undefined;
      },
    );

    const spans = getCapturedSpans();
    expect(spans).toHaveLength(1);
    const attrs = spans[0]!.attributes;
    const head = attrs[GEN_AI_ATTRIBUTES.PROMPT_HEAD] as string;
    const tail = attrs[GEN_AI_ATTRIBUTES.PROMPT_TAIL] as string;
    const hash = attrs[GEN_AI_ATTRIBUTES.PROMPT_HASH] as string;
    expect(head.length).toBe(30);
    expect(tail.length).toBe(30);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    // Critical: full prompt MUST NOT be in the span.
    expect(attrs[GEN_AI_ATTRIBUTES.PROMPT_FULL]).toBeUndefined();
    // And the middle bit (PII risk) should not appear in any attribute value.
    expect(head).not.toContain("PRIVATE_DATA_HERE");
    expect(tail).not.toContain("PRIVATE_DATA_HERE");
  });

  it("records prompt in full mode when adopter opts in", async () => {
    const longPrompt = "x".repeat(50) + "PRIVATE_DATA_HERE" + "y".repeat(50);
    await withGenAiSpan(
      { system: "anthropic", requestModel: "claude-opus-4-7" },
      async (span) => {
        recordPrompt(span, longPrompt, { mode: "full", previewChars: 30 });
        return undefined;
      },
    );

    const spans = getCapturedSpans();
    expect(spans).toHaveLength(1);
    const attrs = spans[0]!.attributes;
    expect(attrs[GEN_AI_ATTRIBUTES.PROMPT_FULL]).toBe(longPrompt);
    expect(attrs[GEN_AI_ATTRIBUTES.PROMPT_HEAD]).toBeUndefined();
  });

  it("records exception + ERROR status when the handler throws", async () => {
    await expect(
      withGenAiSpan(
        { system: "anthropic", requestModel: "claude-opus-4-7" },
        async () => {
          throw new Error("rate-limit");
        },
      ),
    ).rejects.toThrow("rate-limit");

    const spans = getCapturedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0]!.status.code).toBe(2 /* SpanStatusCode.ERROR */);
    expect(spans[0]!.status.message).toBe("rate-limit");
    expect(spans[0]!.events.some((e) => e.name === "exception")).toBe(true);
  });
});

describe("withTenantContext + TenantContextSpanProcessor", () => {
  it("TenantContextSpanProcessor.onStart stamps tenant.id when context is set", async () => {
    const processor = new TenantContextSpanProcessor();
    const recordedAttrs: Record<string, unknown> = {};
    const fakeSpan = {
      setAttribute(k: string, v: unknown) {
        recordedAttrs[k] = v;
      },
    };
    await withTenantContext("01900000-0000-7000-8000-00000000000a", async () => {
      processor.onStart(fakeSpan as never, {} as never);
    });
    expect(recordedAttrs["tenant.id"]).toBe("01900000-0000-7000-8000-00000000000a");
  });

  it("processor doesn't stamp when no context is active", () => {
    const processor = new TenantContextSpanProcessor();
    const recordedAttrs: Record<string, unknown> = {};
    const fakeSpan = {
      setAttribute(k: string, v: unknown) {
        recordedAttrs[k] = v;
      },
    };
    processor.onStart(fakeSpan as never, {} as never);
    expect(recordedAttrs["tenant.id"]).toBeUndefined();
  });
});

describe("bootstrapObservability idempotency", () => {
  it("second call returns the same SDK without re-initializing", () => {
    const config = ObservabilityConfigSchema.parse({});
    const r1 = bootstrapObservability(config);
    const r2 = bootstrapObservability(config);
    expect(r1.sdk).toBe(r2.sdk);
  });
});
