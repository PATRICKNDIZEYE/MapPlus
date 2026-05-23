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

  app.enableCors({
    origin: process.env['WEB_URL'] ?? 'http://localhost:3000',
    credentials: true,
  });

  // Health check endpoint (used by Docker / UptimeRobot)
  app.getHttpAdapter().get('/health', (_req: unknown, res: { json: (data: object) => void }) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const port = parseInt(process.env['API_PORT'] ?? '3001', 10);
  await app.listen(port);

  Logger.log(`mallGuide API running on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`tRPC endpoint: http://localhost:${port}/trpc`, 'Bootstrap');
}

void bootstrap();
