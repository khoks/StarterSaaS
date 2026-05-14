/**
 * `GET /me` — returns the authenticated user's profile + active tenant.
 *
 * Demonstrates how routes consume the `authContextPlugin`'s decorations:
 * `request.user` + `request.session` are typed automatically.
 *
 * The route is registered with `authContextPlugin({ required: true })`
 * scoped to itself via Fastify's encapsulation — a parent `app` can register
 * the plugin with `required: false` and child route plugins can re-register
 * with stricter requirements.
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export async function registerMeRoute(app: FastifyInstance): Promise<void> {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/me",
    schema: {
      response: {
        200: z.object({
          user: z.object({
            id: z.string(),
            email: z.string(),
            name: z.string().nullable(),
            emailVerified: z.boolean(),
            totpEnabled: z.boolean(),
          }),
          activeTenant: z
            .object({
              tenantId: z.string(),
              roleLabel: z.string(),
            })
            .nullable(),
        }),
        401: z.object({ error: z.string(), message: z.string() }),
      },
    },
    handler: async (request, reply) => {
      if (!request.user || !request.session) {
        return reply.code(401).send({
          error: "unauthenticated",
          message: "Sign in to view this endpoint",
        });
      }
      return {
        user: {
          id: request.user.id,
          email: request.user.email,
          name: request.user.name,
          emailVerified: request.user.emailVerified !== null,
          totpEnabled: request.user.totpEnabled,
        },
        activeTenant: request.session.activeTenant
          ? {
              tenantId: request.session.activeTenant.tenantId,
              roleLabel: request.session.activeTenant.roleLabel,
            }
          : null,
      };
    },
  });
}
