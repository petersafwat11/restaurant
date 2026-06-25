import 'reflect-metadata';
import path from 'node:path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { OrderStatus } from '@repo/types';
import { I18nJsonLoader, I18nModule, I18nService } from 'nestjs-i18n';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { notificationCopyFor } from './notification-matrix';

// Mirror of the runtime loader in app.module.ts. `includeSubfolders` is the
// critical bit: without it nestjs-i18n ignores the shared/ folder and every
// `shared.order-*` key falls back to its raw key string.
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
          includeSubfolders: true,
        }),
      ],
      resolvers: [],
    }),
  ],
})
class TestI18nModule {}

describe('notificationCopyFor', () => {
  let i18n: I18nService;
  // biome-ignore lint/suspicious/noExplicitAny: Nest application context handle
  let app: any;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(TestI18nModule, {
      logger: false,
    });
    i18n = app.get(I18nService);
    // Ensure the loader has finished reading the JSON tree before asserting.
    await i18n.refresh();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('renders the English order-status title and body from the catalog', () => {
    const copy = notificationCopyFor(i18n, 'PENDING', '1042', 'en');
    expect(copy.title).toBe('Order 1042 — Pending');
    expect(copy.body).toBe(
      "Order 1042 placed — we'll let you know when it's confirmed.",
    );
  });

  it('renders the Polish order-status title and body from the catalog', () => {
    const copy = notificationCopyFor(i18n, 'PENDING', '1042', 'pl');
    expect(copy.title).toBe('Zamówienie 1042 — Oczekujące');
    expect(copy.body).toContain('Zamówienie 1042 złożone');
  });

  it('falls back to the status label for statuses with no notify line', () => {
    // PREPARING has no `shared.order-notify.*` entry → body is the status label.
    const copy = notificationCopyFor(i18n, 'PREPARING', '7', 'en');
    expect(copy.body).toBe('Preparing');
  });

  // Regression guard for the i18n-loader bug: a missing translation makes
  // nestjs-i18n echo the raw key, so the copy would contain "shared.". If this
  // ever fires, the loader config or the kebab key names have drifted.
  it('never leaks raw i18n keys for any status, in either locale', () => {
    const statuses: OrderStatus[] = [
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED',
      'REFUNDED',
    ];
    for (const locale of ['en', 'pl'] as const) {
      for (const status of statuses) {
        const copy = notificationCopyFor(i18n, status, '99', locale);
        expect(copy.title, `${locale}/${status} title`).not.toContain('shared.');
        expect(copy.body, `${locale}/${status} body`).not.toContain('shared.');
      }
    }
  });
});
