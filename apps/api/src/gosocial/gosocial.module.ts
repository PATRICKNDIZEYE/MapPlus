import { Module } from '@nestjs/common';
import { GoSocialService } from './gosocial.service';
import { GoSocialRouter } from './gosocial.router';

@Module({
  providers: [GoSocialService, GoSocialRouter],
  exports:   [GoSocialService, GoSocialRouter],
})
export class GoSocialModule {}
