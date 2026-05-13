/**
 * @starter-saas/cli — `starter-saas` command-line interface.
 *
 * The CLI binary (`./bin/starter-saas.mjs`) imports the factory + runs against
 * `process.argv`; tests + adopter embeddings can use `buildCli()` directly
 * against a custom argv array.
 */

export { buildCli } from "./cli.js";
export { CLI_VERSION } from "./version.js";
