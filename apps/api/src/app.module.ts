import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { MediaModule } from './media/media.module';
import { TrpcModule } from './trpc/trpc.module';
import { TrpcMiddleware } from './trpc/trpc.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // Look for .env in the API directory first, then walk up to monorepo root
      envFilePath: [
        '.env.local',
        '.env',
        '../../.env.local',
        '../../.env',
      ],
    }),
    DatabaseModule,
    MediaModule,
    TrpcModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Mount tRPC at /trpc — all procedures live under this path
    consumer
      .apply(TrpcMiddleware)
      .forRoutes({ path: 'trpc*', method: RequestMethod.ALL });
  }
}
