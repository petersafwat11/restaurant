// Client-only stub for @prisma/client and its runtime. The browser never
// touches Decimal arithmetic — @repo/utils' barrel re-exports money.ts which
// imports Prisma, so we alias Prisma to this empty module in the client build
// (Webpack + Turbopack).
export {};
