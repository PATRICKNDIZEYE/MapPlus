import { Global, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MediaService } from './media.service';
import { MediaRouter } from './media.router';

@Global()
@Module({
  imports: [
    ServeStaticModule.forRootAsync({
      imports:  [ConfigModule],
      inject:   [ConfigService],
      useFactory: (cfg: ConfigService) => {
        // Only serve /uploads/* locally in development
        if (cfg.get('nodeEnv') !== 'production') {
          return [{
            rootPath:     join(process.cwd(), 'uploads'),
            serveRoot:    '/uploads',
            serveStaticOptions: { index: false },
          }];
        }
        return [];
      },
    }),
  ],
  providers: [MediaService, MediaRouter],
  exports:   [MediaService, MediaRouter],
})
export class MediaModule {}
