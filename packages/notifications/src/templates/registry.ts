/**
 * `TemplateRegistry` — adopter-facing registry for email templates.
 *
 * Adopters:
 *   1. `new TemplateRegistry()` instantiates with the kit defaults
 *   2. `registry.register(adopterTemplate)` adds + replaces existing IDs
 *   3. `registry.render(request)` is called by the bus consumer to produce
 *      a `RenderedEmail` from a `NotificationEmailRequest`
 *
 * Per-tenant overrides: if a `TenantTemplateLoader` is configured + a row
 * exists for `(tenantId, templateId)`, the override's subject/textBody/htmlBody
 * win. Otherwise the registered template wins.
 *
 * Variable validation: the template's Zod schema validates `request.variables`
 * before rendering. Failures throw — adopter's bus consumer's retry/DLQ
 * handles bad inputs.
 */

import type {
  NotificationEmailRequest,
  RenderedEmail,
} from "../contracts.js";

import { DEFAULT_TEMPLATES } from "./defaults.js";
import { renderTemplateStrict } from "./render.js";
import type { EmailTemplate, TenantTemplateOverride } from "./types.js";

/** Hook the registry calls to look up a per-tenant template override. */
export interface TenantTemplateLoader {
  load(args: {
    tenantId: string;
    templateId: string;
  }): Promise<TenantTemplateOverride | null>;
}

export interface TemplateRegistryOptions {
  /** Skip seeding kit defaults — useful for adopters who want a fully custom
   *  template set. Default false. */
  skipDefaults?: boolean;
  /** Per-tenant override loader. Optional — when omitted, only registered
   *  templates are used. */
  tenantLoader?: TenantTemplateLoader;
}

export class TemplateRegistry {
  private readonly templates = new Map<string, EmailTemplate>();
  private readonly tenantLoader?: TenantTemplateLoader;

  constructor(options: TemplateRegistryOptions = {}) {
    if (!options.skipDefaults) {
      for (const tpl of DEFAULT_TEMPLATES) this.templates.set(tpl.id, tpl);
    }
    if (options.tenantLoader !== undefined) {
      this.tenantLoader = options.tenantLoader;
    }
  }

  /** Register a new template OR replace an existing one. Adopters typically
   *  call this once at boot to override kit defaults or add new IDs. */
  register(template: EmailTemplate): void {
    this.templates.set(template.id, template);
  }

  /** True when a template with `id` is registered (per-tenant overrides are
   *  not checked here — they're checked at render time). */
  has(templateId: string): boolean {
    return this.templates.has(templateId);
  }

  /** Render a notification request into a ready-to-send email. */
  async render(request: NotificationEmailRequest): Promise<RenderedEmail> {
    const base = this.templates.get(request.templateId);
    if (!base) {
      throw new Error(`Template not found: ${request.templateId}`);
    }

    // Validate variables against the template's schema.
    const parsed = base.variables.parse(request.variables);

    // Tenant override (per ADR-0004 §4 — per-tenant `notification_templates`).
    const override =
      this.tenantLoader && request.tenantId !== null
        ? await this.tenantLoader.load({
            tenantId: request.tenantId,
            templateId: request.templateId,
          })
        : null;

    const subjectTemplate = override?.subject ?? base.subject;
    const textBodyTemplate = override?.textBody ?? base.textBody;
    const htmlBodyTemplate =
      override?.htmlBody !== undefined && override.htmlBody !== null
        ? override.htmlBody
        : base.htmlBody;

    const subject = renderTemplateStrict(subjectTemplate, parsed);
    const textBody = renderTemplateStrict(textBodyTemplate, parsed);
    const htmlBody =
      htmlBodyTemplate !== undefined
        ? renderTemplateStrict(htmlBodyTemplate, parsed)
        : undefined;

    const result: RenderedEmail = {
      to: request.to,
      subject,
      textBody,
      templateId: request.templateId,
      tenantId: request.tenantId,
    };
    if (htmlBody !== undefined) {
      result.htmlBody = htmlBody;
    }
    if (request.replyTo !== undefined) {
      result.replyTo = request.replyTo;
    } else if (base.defaultReplyTo !== undefined) {
      result.replyTo = base.defaultReplyTo;
    }
    return result;
  }
}
