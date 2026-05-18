/**
 * GenAI span helpers per ADR-0006 — wraps an LLM call in a span with the
 * OTel GenAI semantic-convention attributes attached.
 *
 * STORY-022's `@starter-saas/llm-gateway` will use these helpers as the
 * single integration point — every LLM call goes through `withGenAiSpan(...)`
 * so cost dashboards (sub-PR #3) + Langfuse traces (v1+) + general OTel
 * backends all see consistent attribute names.
 *
 * Attribute names follow OTel GenAI semconv (work-in-progress; pinned to
 * the 1.28 release). Update notes in package README if semconv breaks.
 */

import { SpanKind, SpanStatusCode, trace, type Span } from "@opentelemetry/api";

import { hashRecipient } from "./hash.js";

/** OTel GenAI semconv attribute names. Pinned to semconv 1.28 (Nov 2024). */
export const GEN_AI_ATTRIBUTES = {
  SYSTEM: "gen_ai.system",
  REQUEST_MODEL: "gen_ai.request.model",
  REQUEST_MAX_TOKENS: "gen_ai.request.max_tokens",
  REQUEST_TEMPERATURE: "gen_ai.request.temperature",
  REQUEST_TOP_P: "gen_ai.request.top_p",
  RESPONSE_ID: "gen_ai.response.id",
  RESPONSE_MODEL: "gen_ai.response.model",
  RESPONSE_FINISH_REASONS: "gen_ai.response.finish_reasons",
  USAGE_INPUT_TOKENS: "gen_ai.usage.input_tokens",
  USAGE_OUTPUT_TOKENS: "gen_ai.usage.output_tokens",
  USAGE_CACHE_READ_TOKENS: "gen_ai.usage.cache_read_tokens",
  USAGE_CACHE_CREATION_TOKENS: "gen_ai.usage.cache_creation_tokens",
  /** Cost in USD. Kit extension — not in OTel semconv yet. */
  COST_USD: "gen_ai.cost.usd",
  /** Kit extensions for the prompt-preview discipline (ADR-0006). */
  PROMPT_HEAD: "gen_ai.kit.prompt_head",
  PROMPT_TAIL: "gen_ai.kit.prompt_tail",
  PROMPT_HASH: "gen_ai.kit.prompt_hash",
  PROMPT_FULL: "gen_ai.kit.prompt_full",
} as const;

export interface GenAiSpanOptions {
  /** Provider identifier — "anthropic" | "openai" | "ollama" | adopter-string. */
  system: string;
  /** Model name requested by the caller. */
  requestModel: string;
  /** Optional adopter-supplied span name. Default `gen_ai.<system>`. */
  spanName?: string;
  /** Optional max tokens / temperature / top_p — passed through to attributes. */
  requestMaxTokens?: number;
  requestTemperature?: number;
  requestTopP?: number;
  /** Tenant scope — set on the span as the kit's `tenant.id` extension
   *  attribute. Cost-rollup consumer keys aggregations off this. */
  tenantId?: string;
  /** Feature ID — adopter-defined logical grouping (e.g. "chat", "summarize"). */
  featureId?: string;
}

export interface GenAiUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  /** Cost in USD — computed by the LLM Gateway from pricing tables. */
  costUsd?: number;
  /** Response identifier from the provider. */
  responseId?: string;
  /** Model name returned by the provider (may differ from request when the
   *  provider routed to a different version). */
  responseModel?: string;
  /** Finish reasons array — usually one element. */
  finishReasons?: readonly string[];
}

/** Wrap an async function in a GenAI span. The callback gets the active
 *  span so it can call `recordUsage(...)` after the LLM call returns. */
export async function withGenAiSpan<T>(
  opts: GenAiSpanOptions,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer("@starter-saas/observability");
  const spanName = opts.spanName ?? `gen_ai.${opts.system}`;
  return tracer.startActiveSpan(
    spanName,
    {
      kind: SpanKind.CLIENT,
      attributes: buildRequestAttributes(opts),
    },
    async (span) => {
      try {
        const result = await fn(span);
        return result;
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      } finally {
        span.end();
      }
    },
  );
}

/** Record usage attributes on the active GenAI span after the LLM call returns.
 *  Adopter calls this from inside the `withGenAiSpan` callback. */
export function recordGenAiUsage(span: Span, usage: GenAiUsage): void {
  if (usage.inputTokens !== undefined) {
    span.setAttribute(GEN_AI_ATTRIBUTES.USAGE_INPUT_TOKENS, usage.inputTokens);
  }
  if (usage.outputTokens !== undefined) {
    span.setAttribute(GEN_AI_ATTRIBUTES.USAGE_OUTPUT_TOKENS, usage.outputTokens);
  }
  if (usage.cacheReadTokens !== undefined) {
    span.setAttribute(GEN_AI_ATTRIBUTES.USAGE_CACHE_READ_TOKENS, usage.cacheReadTokens);
  }
  if (usage.cacheCreationTokens !== undefined) {
    span.setAttribute(
      GEN_AI_ATTRIBUTES.USAGE_CACHE_CREATION_TOKENS,
      usage.cacheCreationTokens,
    );
  }
  if (usage.costUsd !== undefined) {
    span.setAttribute(GEN_AI_ATTRIBUTES.COST_USD, usage.costUsd);
  }
  if (usage.responseId !== undefined) {
    span.setAttribute(GEN_AI_ATTRIBUTES.RESPONSE_ID, usage.responseId);
  }
  if (usage.responseModel !== undefined) {
    span.setAttribute(GEN_AI_ATTRIBUTES.RESPONSE_MODEL, usage.responseModel);
  }
  if (usage.finishReasons !== undefined && usage.finishReasons.length > 0) {
    span.setAttribute(GEN_AI_ATTRIBUTES.RESPONSE_FINISH_REASONS, [...usage.finishReasons]);
  }
}

/** Record prompt content on the active span, respecting the kit's
 *  preview-by-default discipline. Adopter calls from inside the
 *  `withGenAiSpan` callback. */
export function recordPrompt(
  span: Span,
  prompt: string,
  options: {
    mode: "preview" | "full";
    previewChars: number;
  },
): void {
  if (options.mode === "full") {
    span.setAttribute(GEN_AI_ATTRIBUTES.PROMPT_FULL, prompt);
    return;
  }
  const n = options.previewChars;
  const head = prompt.slice(0, n);
  const tail = prompt.length > n * 2 ? prompt.slice(-n) : "";
  span.setAttribute(GEN_AI_ATTRIBUTES.PROMPT_HEAD, head);
  if (tail !== "") {
    span.setAttribute(GEN_AI_ATTRIBUTES.PROMPT_TAIL, tail);
  }
  span.setAttribute(GEN_AI_ATTRIBUTES.PROMPT_HASH, hashRecipient(prompt));
}

function buildRequestAttributes(opts: GenAiSpanOptions): Record<string, string | number> {
  const attrs: Record<string, string | number> = {
    [GEN_AI_ATTRIBUTES.SYSTEM]: opts.system,
    [GEN_AI_ATTRIBUTES.REQUEST_MODEL]: opts.requestModel,
  };
  if (opts.requestMaxTokens !== undefined) {
    attrs[GEN_AI_ATTRIBUTES.REQUEST_MAX_TOKENS] = opts.requestMaxTokens;
  }
  if (opts.requestTemperature !== undefined) {
    attrs[GEN_AI_ATTRIBUTES.REQUEST_TEMPERATURE] = opts.requestTemperature;
  }
  if (opts.requestTopP !== undefined) {
    attrs[GEN_AI_ATTRIBUTES.REQUEST_TOP_P] = opts.requestTopP;
  }
  if (opts.tenantId !== undefined) {
    attrs["tenant.id"] = opts.tenantId;
  }
  if (opts.featureId !== undefined) {
    attrs["app.feature_id"] = opts.featureId;
  }
  return attrs;
}
