export * from './slugify';
// `format.ts` is browser-safe (no @prisma/client/runtime dependency).
// Server-only Decimal helpers live in `./money` and `./loyalty` and are
// reachable via the `@repo/utils/money` / `@repo/utils/loyalty` subpaths
// — exporting them from the barrel pulls Prisma's Node-only runtime into
// client bundles even with sideEffects:false (TS-via-transpilePackages
// doesn't tree-shake `export *`).
export * from './format';
export * from './geo';
export * from './structured-data';
export * from './sitemap';
