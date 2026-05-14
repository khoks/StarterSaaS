/**
 * Kit-default `/health` route — registered automatically by `createGateway`
 * unless the adopter opts out via `registerHealthRoute: false`.
 *
 * Response shape is Zod-schema'd + serializer-validated; the adopter's
 * monitoring system can rely on the contract.
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  uptime: z.number().nonnegative(),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/health",
    schema: {
      response: {
        200: HealthResponseSchema,
      },
    },
    handler: async () => ({
      status: "ok" as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  });
}
