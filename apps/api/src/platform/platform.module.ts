import { Module, Global } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PlatformConfigService } from './platform-config.service';
import { PlatformRouter } from './platform.router';

/**
 * Global module — `PlatformConfigService` is consumed by OrdersService,
 * RentAvanceService, GoSocialService, etc. to read runtime config.
 */
@Global()
@Module({
  providers: [PlatformService, PlatformConfigService, PlatformRouter],
  exports:   [PlatformService, PlatformConfigService, PlatformRouter],
})
export class PlatformModule {}
