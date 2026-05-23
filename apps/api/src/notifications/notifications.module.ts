import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsRouter } from './notifications.router';

@Global()
@Module({
  providers: [NotificationsService, NotificationsRouter],
  exports:   [NotificationsService, NotificationsRouter],
})
export class NotificationsModule {}
