import 'reflect-metadata';
import path from 'node:path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { I18nJsonLoader, I18nModule } from 'nestjs-i18n';

/**
 * Standalone Nest context that only loads the I18nModule with
 * `typesOutputPath` set. Booting the context fires nestjs-i18n's type
 * generator side-effect; we then close cleanly. Run with:
 *
 *   pnpm --filter @repo/api generate:i18n-types
 *
 * The output (`apps/api/src/generated/i18n.generated.ts`) is committed and
 * used by services / controllers for typed `i18n.t('namespace.key')` calls.
 */

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'pl',
      loaders: [
        new I18nJsonLoader({
          path: path.join(
            path.dirname(require.resolve('@repo/i18n/package.json')),
            'messages',
          ),
          watch: false,
        }),
      ],
      resolvers: [],
      typesOutputPath: path.join(__dirname, '../src/generated/i18n.generated.ts'),
    }),
  ],
})
class I18nTypesGenModule {}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(I18nTypesGenModule, {
    logger: ['error', 'warn'],
  });
  // The generator writes asynchronously after the loader resolves. Give it
  // a tick to flush — empirically nestjs-i18n needs ~100–500ms.
  await new Promise((r) => setTimeout(r, 1500));
  await app.close();
  // biome-ignore lint/suspicious/noConsole: CLI script
  console.log('Generated i18n.generated.ts');
}

main().catch((e) => {
  // biome-ignore lint/suspicious/noConsole: CLI script
  console.error(e);
  process.exit(1);
});
