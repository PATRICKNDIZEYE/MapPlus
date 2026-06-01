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
      // Always serve /uploads/* — in production this is the fallback when no
      // S3 credentials are configured. Files survive only as long as the
      // container does, but the upload flow works end-to-end for demos.
      useFactory: () => [{
        rootPath:     join(process.cwd(), 'uploads'),
        serveRoot:    '/uploads',
        serveStaticOptions: { index: false },
      }],
    }),
  ],
  providers: [MediaService, MediaRouter],
  exports:   [MediaService, MediaRouter],
})
export class MediaModule {}
