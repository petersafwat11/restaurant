// Side-effect module: populate the env vars `config/env.ts` validates at import
// time, so a unit spec can import a Nest provider (which transitively loads the
// ENV symbol from config.module → env) without a live .env. Imported FIRST in
// specs that pull a provider class. Values are throwaway — provider tests inject
// their own fake env object and never read these.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'unit-test-access-secret-must-be-at-least-32-chars';
process.env.JWT_REFRESH_SECRET ??= 'unit-test-refresh-secret-must-be-at-least-32-chars';
