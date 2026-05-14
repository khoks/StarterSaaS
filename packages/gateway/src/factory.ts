/**
 * `createGateway` — Fastify factory with kit-default plugins wired up.
 *
 * Returns a Fastify instance configured with:
 *   - The Zod type provider so route `schema.body` / `schema.response` are
 *     full Zod schemas + the route handler's `request.body` is typed.
 *   - An error handler that formats Zod validation failures as structured
 *     400 responses (`{ error: "validation_error", issues: ZodIssue[] }`).
 *   - The kit-default logger (off by default in tests; pino-pretty in dev).
 *
 * Adopter usage:
 *
 *     const app = await createGateway();
 *     app.route({
 *       method: "POST",
 *       url: "/users",
 *       schema: { body: z.object({ email: z.string().email() }) },
 *       handler: async (req) => { ... },
 *     });
 *     await app.listen({ port: 3000 });
 */

import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import { registerHealthRoute } from "./routes/health.js";

export interface CreateGatewayOptions {
  /** Forwarded to Fastify's constructor — adopter can disable logging in tests,
   *  swap in pino, set bodyLimit, etc. */
  fastify?: FastifyServerOptions;
  /** When false (default), suppresses registration of the kit's `/health`
   *  route. Adopters who want their own can opt out. */
  registerHealthRoute?: boolean;
}

/** The Fastify instance returned by `createGateway` — uses the Zod type provider
 *  so adopter routes typing on `schema.body`/`schema.response` works out of the box. */
export type GatewayInstance = FastifyInstance & {
  withTypeProvider: FastifyInstance["withTypeProvider"];
};

export async function createGateway(
  options: CreateGatewayOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify(options.fastify ?? { logger: false }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.code(400).send({
        error: "validation_error",
        message: error.message,
        issues: error.validation,
      });
    }
    // Fall through to Fastify's default error formatting.
    return reply.send(error);
  });

  if (options.registerHealthRoute !== false) {
    await registerHealthRoute(app);
  }

  return app;
}
