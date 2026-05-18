/**
 * OTel SDK bootstrap per ADR-0006.
 *
 * MVP-1 scope: the SDK initializes with the adaptive sampler + a Resource
 * carrying `service.name` / `service.version` / `deployment.environment`.
 * Adopter installs concrete exporters (OTLP HTTP / CloudWatch / Cloud
 * Logging / etc.) via the `spanProcessors` option; default = in-memory
 * exporter for dev + tests.
 *
 * Concrete cloud-native backends (`@starter-saas/observability-cloudwatch` /
 * `@starter-saas/observability-cloud-logging`) ship in subsequent sub-PRs of
 * STORY-019. Langfuse wiring lands with STORY-022's LLM Gateway integration.
 */

import { trace, type Tracer } from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";

import type { ObservabilityConfig } from "./config.js";
import { AdaptiveSampler } from "./sampler.js";

/** Helper to widen the cast-target type for `NodeSDK.spanProcessors`.
 *  Returns the underlying SpanProcessor[] type without the `| undefined` that
 *  indexed access produces under `exactOptionalPropertyTypes`. */
function asSpanProcessors(p: SpanProcessor[]): SpanProcessor[] {
  return p;
}

export interface BootstrapObservabilityOptions {
  /** Custom span processors — typically OTLP exporters in production.
   *  When omitted, the kit installs an `InMemorySpanExporter` so dev + tests
   *  can inspect captured spans via `getCapturedSpans()`. */
  spanProcessors?: SpanProcessor[];
}

let activeSdk: NodeSDK | null = null;
let activeInMemoryExporter: InMemorySpanExporter | null = null;
const ATTR_DEPLOYMENT_ENVIRONMENT = "deployment.environment";

export interface BootstrapResult {
  sdk: NodeSDK;
  /** Reference to the SDK's tracer — `tracer.startActiveSpan(...)` is what
   *  adopter code uses to instrument paths the kit doesn't auto-instrument. */
  tracer: Tracer;
  /** Set when the kit installed its default in-memory exporter; null when
   *  the adopter supplied their own span processors. Tests use this to
   *  inspect spans without setting up an OTLP collector. */
  inMemoryExporter: InMemorySpanExporter | null;
}

/** Initialize the OTel SDK with the kit's defaults. Idempotent — second call
 *  is a no-op + returns the existing SDK. */
export function bootstrapObservability(
  config: ObservabilityConfig,
  options: BootstrapObservabilityOptions = {},
): BootstrapResult {
  if (activeSdk) {
    return {
      sdk: activeSdk,
      tracer: trace.getTracer(config.serviceName, config.serviceVersion),
      inMemoryExporter: activeInMemoryExporter,
    };
  }

  let exporter: InMemorySpanExporter | null = null;
  let processors = options.spanProcessors ?? [];
  if (processors.length === 0) {
    exporter = new InMemorySpanExporter();
    processors = [new SimpleSpanProcessor(exporter)];
  }

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: config.serviceName,
    ...(config.serviceVersion !== undefined
      ? { [ATTR_SERVICE_VERSION]: config.serviceVersion }
      : {}),
    [ATTR_DEPLOYMENT_ENVIRONMENT]: config.environment,
  });

  const sdk = new NodeSDK({
    resource,
    // Disable auto-detection — the kit only ships service.name + version +
    // environment; further resource attributes are an adopter concern.
    // Auto-detection runs async + can delay tracer registration in tests.
    autoDetectResources: false,
    sampler: new AdaptiveSampler({
      healthyRate: config.sampling.healthyRate,
      errorRate: config.sampling.errorRate,
    }),
    // The SpanProcessor types between sdk-trace-base + sdk-node's bundled copy
    // are nominally distinct (npm hoisting), so we cast — they're structurally
    // identical and the runtime is the same code. Cast eliminates the
    // `| undefined` from the indexed-access type that `exactOptionalPropertyTypes`
    // would otherwise leak into the param.
    spanProcessors: processors as unknown as ReturnType<typeof asSpanProcessors>,
  });
  sdk.start();

  activeSdk = sdk;
  activeInMemoryExporter = exporter;

  return {
    sdk,
    tracer: trace.getTracer(config.serviceName, config.serviceVersion),
    inMemoryExporter: exporter,
  };
}

/** Shutdown the SDK + flush spans. Tests + graceful-shutdown handlers call
 *  this. Resets the singleton so a fresh bootstrap can run after. */
export async function shutdownObservability(): Promise<void> {
  if (!activeSdk) return;
  await activeSdk.shutdown();
  activeSdk = null;
  activeInMemoryExporter = null;
}

/** Test/diagnostic helper — read the captured spans from the in-memory
 *  exporter. Returns an empty array when the adopter wired their own
 *  exporters (i.e. no in-memory capture). */
export function getCapturedSpans(): ReturnType<InMemorySpanExporter["getFinishedSpans"]> {
  if (!activeInMemoryExporter) return [];
  return activeInMemoryExporter.getFinishedSpans();
}

/** Test helper — clear captured spans between assertions. */
export function resetCapturedSpans(): void {
  activeInMemoryExporter?.reset();
}
