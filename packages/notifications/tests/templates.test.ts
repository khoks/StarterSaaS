/**
 * TemplateRegistry + rendering + per-tenant overrides.
 */

import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  DEFAULT_TEMPLATES,
  TemplateRegistry,
  renderTemplate,
  renderTemplateStrict,
  type TenantTemplateLoader,
} from "../src/index.js";

describe("renderTemplate()", () => {
  it("substitutes flat {{var}} references", () => {
    const result = renderTemplate("Hello {{name}}, you are {{age}}", {
      name: "Ada",
      age: 36,
    });
    expect(result.output).toBe("Hello Ada, you are 36");
    expect(result.missing).toEqual([]);
  });

  it("flags missing variables but doesn't throw", () => {
    const result = renderTemplate("Hi {{missing}}!", {});
    expect(result.output).toBe("Hi {{missing}}!");
    expect(result.missing).toEqual(["missing"]);
  });

  it("renders booleans + numbers as their string form", () => {
    const result = renderTemplate("active={{active}} count={{count}}", {
      active: true,
      count: 0,
    });
    expect(result.output).toBe("active=true count=0");
  });

  it("renderTemplateStrict throws on missing variables", () => {
    expect(() => renderTemplateStrict("Hi {{missing}}!", {})).toThrow(/missing/);
  });
});

describe("TemplateRegistry — defaults", () => {
  it("seeds kit defaults on construction", () => {
    const registry = new TemplateRegistry();
    for (const tpl of DEFAULT_TEMPLATES) {
      expect(registry.has(tpl.id)).toBe(true);
    }
  });

  it("skipDefaults yields an empty registry", () => {
    const registry = new TemplateRegistry({ skipDefaults: true });
    expect(registry.has("welcome")).toBe(false);
  });
});

describe("TemplateRegistry — render", () => {
  it("renders the welcome template", async () => {
    const registry = new TemplateRegistry();
    const result = await registry.render({
      tenantId: "01900000-0000-7000-8000-000000000001",
      templateId: "welcome",
      variables: {
        tenantName: "Acme Corp",
        tenantSlug: "acme",
        appUrl: "https://app.example.com",
      },
      to: { email: "owner@acme.test" },
    });
    expect(result.subject).toBe("Welcome to Acme Corp!");
    expect(result.textBody).toContain('tenant "Acme Corp"');
    expect(result.textBody).toContain("https://app.example.com");
  });

  it("validates variables against the template's Zod schema", async () => {
    const registry = new TemplateRegistry();
    await expect(
      registry.render({
        tenantId: null,
        templateId: "welcome",
        variables: { tenantName: "X" }, // missing tenantSlug + appUrl
        to: { email: "x@y.test" },
      }),
    ).rejects.toThrow();
  });

  it("throws for unknown templateId", async () => {
    const registry = new TemplateRegistry();
    await expect(
      registry.render({
        tenantId: null,
        templateId: "no-such-template",
        variables: {},
        to: { email: "x@y.test" },
      }),
    ).rejects.toThrow(/not found/i);
  });

  it("adopter-registered template overrides kit default", async () => {
    const registry = new TemplateRegistry();
    registry.register({
      id: "welcome",
      variables: z.object({ tenantName: z.string() }),
      subject: "Custom subject for {{tenantName}}",
      textBody: "custom body",
    });
    const result = await registry.render({
      tenantId: null,
      templateId: "welcome",
      variables: { tenantName: "Z" },
      to: { email: "x@y.test" },
    });
    expect(result.subject).toBe("Custom subject for Z");
    expect(result.textBody).toBe("custom body");
  });
});

describe("TemplateRegistry — per-tenant overrides", () => {
  it("loader returning null falls back to the registered template", async () => {
    const loader: TenantTemplateLoader = {
      load: vi.fn().mockResolvedValue(null),
    };
    const registry = new TemplateRegistry({ tenantLoader: loader });
    const result = await registry.render({
      tenantId: "01900000-0000-7000-8000-000000000001",
      templateId: "welcome",
      variables: {
        tenantName: "X",
        tenantSlug: "x",
        appUrl: "https://app.example.com",
      },
      to: { email: "owner@x.test" },
    });
    expect(loader.load).toHaveBeenCalled();
    expect(result.subject).toBe("Welcome to X!");
  });

  it("loader returning an override uses its subject + body", async () => {
    const loader: TenantTemplateLoader = {
      async load() {
        return {
          tenantId: "01900000-0000-7000-8000-000000000001",
          templateId: "welcome",
          subject: "Tenant-custom: {{tenantName}}",
          textBody: "Tenant-custom body for {{tenantName}}",
          htmlBody: null,
        };
      },
    };
    const registry = new TemplateRegistry({ tenantLoader: loader });
    const result = await registry.render({
      tenantId: "01900000-0000-7000-8000-000000000001",
      templateId: "welcome",
      variables: {
        tenantName: "Acme",
        tenantSlug: "acme",
        appUrl: "https://app.example.com",
      },
      to: { email: "owner@acme.test" },
    });
    expect(result.subject).toBe("Tenant-custom: Acme");
    expect(result.textBody).toBe("Tenant-custom body for Acme");
  });

  it("tenantId: null skips the tenant loader entirely", async () => {
    const loader: TenantTemplateLoader = {
      load: vi.fn().mockResolvedValue({
        tenantId: "x",
        templateId: "welcome",
        subject: "should-not-be-used",
        textBody: "noop",
        htmlBody: null,
      }),
    };
    const registry = new TemplateRegistry({ tenantLoader: loader });
    const result = await registry.render({
      tenantId: null,
      templateId: "welcome",
      variables: {
        tenantName: "X",
        tenantSlug: "x",
        appUrl: "https://app.example.com",
      },
      to: { email: "x@y.test" },
    });
    expect(loader.load).not.toHaveBeenCalled();
    expect(result.subject).toBe("Welcome to X!");
  });
});
