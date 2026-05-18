/**
 * Tenant context propagation per ADR-0006.
 *
 * Every span inside a tenant-scoped request should carry `tenant.id` so:
 *   - Cost dashboards (sub-PR #3 of STORY-019) can aggregate by tenant
 *   - Observability backends can filter / group by tenant
 *   - Per-tenant budget enforcement (STORY-020) has the join key it needs
 *
 * Mechanism: Node's `AsyncLocalStorage` carries the tenant ID through the
 * async call stack. The gateway plugin (sub-PR #2 of STORY-019) installs a
 * `withTenantContext` wrapper at request-scope; all child spans created
 * inside the request automatically pick up the tenant attribute via the
 * `TenantContextSpanProcessor`.
 */

import { AsyncLocalStorage } from "node:async_hooks";

import { trace, type Context, type Span } from "@opentelemetry/api";
import type { ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";

const tenantContextStorage = new AsyncLocalStorage<string>();

/** Run `fn` with the given tenant ID set in the async-local context.
 *  Every span created inside `fn` (or any code awaited from within it)
 *  inherits the tenant attribute via `TenantContextSpanProcessor`. */
export async function withTenantContext<T>(
  tenantId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return tenantContextStorage.run(tenantId, fn);
}

/** Get the current tenant ID, or `undefined` if no tenant context is active. */
export function getCurrentTenantId(): string | undefined {
  return tenantContextStorage.getStore();
}

/** Span processor that stamps `tenant.id` onto every span at start time
 *  if the async-local store has one set. Installed alongside the user's
 *  span exporters via the OTel SDK's `spanProcessors` config. */
export class TenantContextSpanProcessor implements SpanProcessor {
  onStart(span: Span, _parentContext: Context): void {
    const tenantId = tenantContextStorage.getStore();
    if (tenantId !== undefined) {
      span.setAttribute("tenant.id", tenantId);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEnd(_span: ReadableSpan): void {
    /* no-op — this processor only annotates at start. */
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async forceFlush(): Promise<void> {
    /* no-op */
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async shutdown(): Promise<void> {
    /* no-op */
  }
}

/** Helper for adopter code that needs to manually annotate the active span.
 *  Usually unnecessary — the span processor handles it — but useful when the
 *  adopter creates spans outside the AsyncLocalStorage scope (e.g. in a
 *  background worker that processed an event with a tenant claim). */
export function setSpanTenant(span: Span, tenantId: string): void {
  span.setAttribute("tenant.id", tenantId);
}

/** Get the active span's tracer-API handle for adopter code. Re-exported
 *  here so adopters don't have to import directly from `@opentelemetry/api`. */
export function getActiveTracer(name: string, version?: string): ReturnType<typeof trace.getTracer> {
  return trace.getTracer(name, version);
}
