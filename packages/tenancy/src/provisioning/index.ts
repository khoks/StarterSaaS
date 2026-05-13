/**
 * Tenant provisioning saga — public exports.
 *
 * Adopters typically:
 *   1. Wire up adapters (migrator / seeder / secrets / billing / notifications)
 *   2. Build the saga via `createTenantProvisioningSaga(deps)`
 *   3. Pass it to `new SagaRunner(new DrizzleSagaStore(db)).run(saga, initialProvisioningState(input))`
 */

export {
  TENANT_PROVISIONING_SAGA_NAME,
  createTenantProvisioningSaga,
  runTenantProvisioning,
} from "./saga.js";
export { initialProvisioningState, type ProvisioningState } from "./state.js";
export type { ProvisioningDeps } from "./steps.js";
export {
  noopBillingRegistry,
  noopNotificationsSender,
  noopSecretsProvider,
  noopTenantMigrator,
  noopTenantSeeder,
  type BillingRegistry,
  type NotificationsSender,
  type SchemaManager,
  type SecretsProvider,
  type TenantDb,
  type TenantMigrator,
  type TenantRegistry,
  type TenantSeeder,
} from "./ports.js";
export {
  DrizzleSchemaManager,
  DrizzleTenantRegistry,
} from "./drizzle-adapters.js";
export {
  TENANT_PROVISIONED_EVENT,
  TENANT_PROVISIONING_FAILED_EVENT,
  TENANT_PROVISIONING_TOPIC,
  TenantProvisionedPayloadSchema,
  TenantProvisioningFailedPayloadSchema,
  type TenantProvisionedPayload,
  type TenantProvisioningFailedPayload,
} from "./events.js";
export { isTenantSchemaName, tenantSchemaName } from "./schema-name.js";
