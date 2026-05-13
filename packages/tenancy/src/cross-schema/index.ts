/**
 * Cross-schema query primitives — per ADR-0004 §2.
 *
 * The `withTenants()` wrapper is the supported cross-schema query path for
 * ad-hoc admin queries iterating a subset of tenants. Federated SQL views
 * are explicitly rejected (brittle when tenant schemas evolve).
 */

export {
  withTenants,
  partitionTenantResults,
  type TenantQueryContext,
  type TenantQueryFn,
  type TenantResult,
  type WithTenantsOptions,
} from "./with-tenants.js";
