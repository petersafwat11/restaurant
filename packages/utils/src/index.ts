export * from './slugify';
export * from './phone';
export * from './assert';
// `format.ts` is browser-safe (no @prisma/client/runtime dependency).
// Server-only Decimal helpers live in `./money` and `./loyalty` and are
// reachable via the `@repo/utils/money` / `@repo/utils/loyalty` subpaths
// — exporting them from the barrel pulls Prisma's Node-only runtime into
// client bundles even with sideEffects:false (TS-via-transpilePackages
// doesn't tree-shake `export *`).
export * from './format';
export * from './deep-link';
export * from './structured-data';
export * from './sitemap';
