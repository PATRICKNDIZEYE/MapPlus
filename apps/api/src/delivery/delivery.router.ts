import { Injectable } from '@nestjs/common';
import { router } from '../trpc/trpc.init';

@Injectable()
export class DeliveryRouter {
  get trpcRouter() {
    return router({});
  }
}
