/**
 * `{{variable}}` substitution — minimal Handlebars-like rendering.
 *
 * Scope: supports flat `{{name}}` substitution only — no helpers, no
 * conditionals, no loops. Adopters needing richer templates plug in
 * Handlebars/Liquid/Pug by writing their own `TemplateRegistry` impl
 * (the kit's `TemplateRegistry` is just an interface).
 *
 * Missing variables raise — adopters get a loud error during template
 * registration tests, not a silent `{{undefined_var}}` in production emails.
 */

const VAR_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export interface RenderResult {
  output: string;
  /** Variable names referenced in the template but missing from the input. */
  missing: readonly string[];
}

export function renderTemplate(
  template: string,
  variables: Record<string, string | number | boolean>,
): RenderResult {
  const missing = new Set<string>();
  const output = template.replace(VAR_PATTERN, (_full, name: string) => {
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      return String(variables[name]);
    }
    missing.add(name);
    return `{{${name}}}`;
  });
  return { output, missing: [...missing] };
}

/** Render-or-throw helper. Use when missing variables should fail loudly. */
export function renderTemplateStrict(
  template: string,
  variables: Record<string, string | number | boolean>,
): string {
  const { output, missing } = renderTemplate(template, variables);
  if (missing.length > 0) {
    throw new Error(
      `Template rendering failed — missing variable(s): ${missing.join(", ")}`,
    );
  }
  return output;
}
