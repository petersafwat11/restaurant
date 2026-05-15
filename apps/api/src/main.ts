import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { initNodeSentry } from '@repo/observability';
import { AppModule } from './app.module';
import { env } from './config/env';

const STRIPE_WEBHOOK_PATH = '/api/v1/payments/webhooks/stripe';

async function bootstrap() {
  // Initialize Sentry before anything else so early errors are captured.
  // No-ops when SENTRY_DSN is empty (dev/test/CI).
  initNodeSentry({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENV || env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });

  const adapter = new FastifyAdapter({ logger: false, trustProxy: true });

  // Capture the raw request body for the Stripe webhook route — needed for
  // signature verification. Replace Nest's default JSON parser with one that
  // stashes raw bytes onto the request for the webhook path only.
  const instance = adapter.getInstance();
  instance.removeContentTypeParser('application/json');
  instance.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      if (req.url?.startsWith(STRIPE_WEBHOOK_PATH)) {
        (req as unknown as { rawBody: Buffer }).rawBody = body as Buffer;
      }
      const buf = body as Buffer;
      const json = buf.length === 0 ? {} : JSON.parse(buf.toString('utf8'));
      done(null, json);
    } catch (err) {
      done(err as Error);
    }
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bodyParser: false,
  });

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: [env.APP_URL_WEB, env.APP_URL_ADMIN],
    credentials: true,
  });

  // Socket.IO uses its own adapter over the Fastify HTTP server.
  app.useWebSocketAdapter(new IoAdapter(app));

  // Swagger UI at /api/v1/docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Restaurant API')
    .setDescription('Restaurant ordering platform — backend API.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document);

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });

  Logger.log(`Listening on :${env.API_PORT}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  // biome-ignore lint/suspicious/noConsole: bootstrap-level error
  console.error('Failed to bootstrap API', err);
  process.exit(1);
});
