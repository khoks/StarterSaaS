#!/usr/bin/env node
/**
 * `starter-saas` CLI entrypoint.
 *
 * Resolves from the published `dist/` build OR the in-repo `src/` during
 * monorepo dev (npm workspaces resolves the package's `main` to whatever the
 * workspace's package.json points at — `./src/index.ts` in dev, `./dist/index.js`
 * post-build via the `tsx` / `tsc` toolchain).
 */
import { buildCli } from "@starter-saas/cli";

buildCli().parseAsync(process.argv).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
