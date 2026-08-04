import 'reflect-metadata';
import { resolve } from 'node:path';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MAX_UPLOAD_BYTES } from '@repo/types';
import { initNodeSentry } from '@repo/observability';
import { AppModule } from './app.module';
import { env } from './config/env';

const ESERVICE_WEBHOOK_PATH = '/api/v1/payments/webhooks/eservice';
const ESERVICE_RETURN_PATH = '/api/v1/payments/eservice/return';

function needsEserviceRawBody(url: string | undefined): boolean {
  return !!url && (url.startsWith(ESERVICE_WEBHOOK_PATH) || url.startsWith(ESERVICE_RETURN_PATH));
}

async function bootstrap() {
  // Initialize Sentry before anything else so early errors are captured.
  // No-ops when SENTRY_DSN is empty (dev/test/CI).
  initNodeSentry({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENV || env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });

  // Trust EXACTLY ONE proxy hop (Caddy). `trustProxy: true` would trust the
  // entire X-Forwarded-For chain, letting a client spoof the left-most entry and
  // forge `req.ip` — which would defeat every IP-keyed rate limit (login
  // brute-force, the card-testing control on payment intents, etc.). With `1`,
  // `req.ip` is the address Caddy appended; client-supplied XFF entries are
  // ignored. Caddy is also configured with `trusted_proxies` as defence-in-depth.
  const adapter = new FastifyAdapter({ logger: false, trustProxy: 1 });

  // Capture the raw request body for the eService webhook route — needed for
  // the SHA512(rawBody + app_key) signature verification. Replace Nest's default
  // JSON parser with one that stashes raw bytes onto the request for the webhook
  // path only.
  const instance = adapter.getInstance();
  instance.removeContentTypeParser('application/json');
  instance.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      if (needsEserviceRawBody(req.url)) {
        (req as unknown as { rawBody: Buffer }).rawBody = body as Buffer;
      }
      const buf = body as Buffer;
      const json = buf.length === 0 ? {} : JSON.parse(buf.toString('utf8'));
      done(null, json);
    } catch (err) {
      done(err as Error);
    }
  });

  // eService's HPP POSTs the transaction result to `return_url` (and may POST the
  // status_url notification) as application/x-www-form-urlencoded. Parse it into an
  // object for controllers, and capture rawBody on the webhook path so the
  // signature check works if a notification ever arrives form-encoded.
  instance.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'buffer' },
    (req, body, done) => {
      try {
        const buf = body as Buffer;
        if (needsEserviceRawBody(req.url)) {
          (req as unknown as { rawBody: Buffer }).rawBody = buf;
        }
        const obj: Record<string, string> = {};
        for (const [k, v] of new URLSearchParams(buf.toString('utf8'))) obj[k] = v;
        done(null, obj);
      } catch (err) {
        done(err as Error);
      }
    },
  );

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bodyParser: false,
  });

  // Cookie support — must be registered before any routes consume cookies.
  await app.register(fastifyCookie as Parameters<typeof app.register>[0]);

  // Multipart support for uploads (single file per request, 5 MB cap).
  await app.register(fastifyMultipart as Parameters<typeof app.register>[0], {
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      files: 1,
    },
  });

  app.setGlobalPrefix('api/v1');

  // Serve uploaded files (menu images, etc.) from the host filesystem. Kept
  // outside the /api/v1 prefix so URLs are short and cache-friendly. In
  // production the same directory is a bind-mounted Docker volume.
  app.useStaticAssets({
    root: resolve(env.UPLOADS_DIR),
    prefix: '/uploads/',
    decorateReply: false,
  });

  app.enableCors({
    origin: [env.APP_URL_WEB, env.APP_URL_ADMIN],
    credentials: true,
  });

  // Socket.IO uses its own adapter over the Fastify HTTP server.
  app.useWebSocketAdapter(new IoAdapter(app));

  // Swagger UI at /api/v1/docs — non-production only. In prod it would both leak
  // the full API surface and render blank under the api domain's locked-down CSP
  // (`default-src 'none'`).
  if (env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Restaurant API')
      .setDescription('Restaurant ordering platform — backend API.')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/v1/docs', app, document);
  }

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });

  Logger.log(`Listening on :${env.API_PORT}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  // biome-ignore lint/suspicious/noConsole: bootstrap-level error
  console.error('Failed to bootstrap API', err);
  process.exit(1);
});
