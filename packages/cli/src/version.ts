/** Kit version surfaced through `starter-saas --version`.
 *  Kept as a literal string so the binary doesn't have to read package.json at
 *  runtime — that would require synchronous fs access from an ESM entrypoint
 *  with no clean path-resolution story under different package managers. */
export const CLI_VERSION = "0.0.0";
