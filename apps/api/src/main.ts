import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Allow comma-separated WEB_URL so Vercel preview deploys (one URL per branch)
  // plus the prod URL can all reach the API without re-deploying.
  const webUrls = (process.env['WEB_URL'] ?? 'http://localhost:3000')
    .split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow no-origin requests (curl, server-to-server, health checks).
      if (!origin) return callback(null, true);
      if (webUrls.includes(origin)) return callback(null, true);
      // Vercel preview pattern: <project>-<hash>.vercel.app
      if (/\.vercel\.app$/.test(new URL(origin).hostname)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
  });

  // Health check (used by Railway, UptimeRobot, Docker).
  app.getHttpAdapter().get('/health', (_req: unknown, res: { json: (data: object) => void }) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Railway sets PORT; local dev uses API_PORT.
  const port = parseInt(process.env['PORT'] ?? process.env['API_PORT'] ?? '3001', 10);
  await app.listen(port, '0.0.0.0');

  Logger.log(`mallGuide API listening on :${port}`, 'Bootstrap');
  Logger.log(`tRPC endpoint: http://localhost:${port}/trpc`, 'Bootstrap');
}

void bootstrap();
