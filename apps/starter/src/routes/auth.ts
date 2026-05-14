/**
 * Auth HTTP routes — wraps the dependency-injected flow functions from
 * `@starter-saas/auth` (sign-up, sign-in, sign-out) in Fastify+Zod routes.
 *
 * Zod schemas mirror the flow-function input shapes; Zod validation errors
 * become structured 400s via the gateway's error handler (sub-PR #1).
 *
 * Sign-in success sets the kit's session cookie + returns the token for
 * Bearer-token usage. Adopter UIs typically rely on the cookie; mobile /
 * machine-to-machine clients use the returned token + the
 * `Authorization: Bearer <token>` header.
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  signIn,
  signOut,
  signUp,
  type AuthDeps,
} from "@starter-saas/auth";

const COOKIE_NAME = "starter-saas-session";

export interface AuthRoutesOptions {
  /** Same `AuthDeps` shape the auth package flows expect — db + emailSender + config. */
  deps: AuthDeps;
  /** When true, sets Secure + SameSite=None on the cookie. Default false
   *  (dev / local; adopter overrides in production). */
  secureCookie?: boolean;
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  options: AuthRoutesOptions,
): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.route({
    method: "POST",
    url: "/auth/sign-up",
    schema: {
      body: z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1).optional(),
      }),
      response: {
        200: z.object({
          userId: z.string().uuid(),
          email: z.string(),
          emailVerificationPending: z.boolean(),
        }),
        409: z.object({ error: z.string(), message: z.string() }),
        400: z.object({ error: z.string(), message: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const result = await signUp(options.deps, request.body);
      if (!result.ok) {
        if (result.error.kind === "email-already-exists") {
          return reply.code(409).send({
            error: "email_already_exists",
            message: "An account with this email already exists",
          });
        }
        return reply.code(400).send({
          error: result.error.kind,
          message: "Sign-up failed",
        });
      }
      return reply.code(200).send({
        userId: result.value.userId,
        email: result.value.email,
        emailVerificationPending: result.value.emailVerificationPending,
      });
    },
  });

  typed.route({
    method: "POST",
    url: "/auth/sign-in",
    schema: {
      body: z.object({
        email: z.string().email(),
        password: z.string().min(1),
        /** Optional TOTP code for users with 2FA enabled. */
        totpCode: z.string().regex(/^\d{6}$/).optional(),
      }),
      response: {
        200: z.object({
          sessionToken: z.string(),
          expires: z.string().datetime(),
          userId: z.string().uuid(),
          email: z.string(),
        }),
        401: z.object({ error: z.string(), message: z.string() }),
        423: z.object({ error: z.string(), message: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const result = await signIn(options.deps, request.body);
      if (!result.ok) {
        if (result.error.kind === "account-locked") {
          return reply.code(423).send({
            error: "account_locked",
            message: "Account is temporarily locked due to too many failed sign-in attempts",
          });
        }
        return reply.code(401).send({
          error: result.error.kind,
          message: "Invalid email or password",
        });
      }

      reply.header(
        "set-cookie",
        formatSessionCookie(
          COOKIE_NAME,
          result.value.sessionToken,
          result.value.expires,
          options.secureCookie ?? false,
        ),
      );

      return reply.code(200).send({
        sessionToken: result.value.sessionToken,
        expires: result.value.expires.toISOString(),
        userId: result.value.userId,
        email: result.value.email,
      });
    },
  });

  typed.route({
    method: "POST",
    url: "/auth/sign-out",
    schema: {
      response: {
        200: z.object({ ok: z.literal(true) }),
      },
    },
    handler: async (request, reply) => {
      // Pull session token from request.session if authContextPlugin populated it;
      // otherwise fall back to defaultTokenExtractor's behavior.
      const cookieToken = readCookie(request.headers.cookie, COOKIE_NAME);
      if (cookieToken) {
        await signOut(options.deps, cookieToken);
      }
      reply.header("set-cookie", clearSessionCookie(COOKIE_NAME, options.secureCookie ?? false));
      return reply.code(200).send({ ok: true });
    },
  });
}

function formatSessionCookie(
  name: string,
  value: string,
  expires: Date,
  secure: boolean,
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Expires=${expires.toUTCString()}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${secure ? "None" : "Lax"}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function clearSessionCookie(name: string, secure: boolean): string {
  const parts = [
    `${name}=`,
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Path=/",
    "HttpOnly",
    `SameSite=${secure ? "None" : "Lax"}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      const value = trimmed.slice(name.length + 1);
      const unquoted = value.startsWith('"') && value.endsWith('"')
        ? value.slice(1, -1)
        : value;
      return unquoted.length > 0 ? decodeURIComponent(unquoted) : null;
    }
  }
  return null;
}
