export {
  DEFAULT_TEMPLATES,
  emailVerificationTemplate,
  passwordResetTemplate,
  tenantInvitationTemplate,
  welcomeTemplate,
} from "./defaults.js";
export {
  renderTemplate,
  renderTemplateStrict,
  type RenderResult,
} from "./render.js";
export {
  TemplateRegistry,
  type TemplateRegistryOptions,
  type TenantTemplateLoader,
} from "./registry.js";
export type { EmailTemplate, TenantTemplateOverride } from "./types.js";
