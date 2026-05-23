import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export interface MomoCollectRequest {
  payerPhone: string;         // 250788000000
  amount: number;
  currency: string;           // 'RWF' for sandbox; 'EUR' for MTN's global sandbox
  externalReference: string;  // our internal id (rent_payment.id, order.id, ...)
  payerMessage?: string;
  payeeNote?: string;
}

export interface MomoDisburseRequest {
  payeePhone: string;
  amount: number;
  currency: string;
  externalReference: string;
  message?: string;
}

export type MomoTxStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED';

export interface MomoTxResult {
  referenceId: string;        // MoMo-side transaction id
  status: MomoTxStatus;
  externalReference: string;
}

/**
 * MTN Mobile Money integration.
 *
 * In dev/sandbox mode the service simulates a successful collection/disbursement
 * after a short delay so the rent + utility flows can be exercised without
 * network calls. In production it talks to the MoMo Open API sandbox/live
 * endpoints. The HTTP integration is wired in a follow-up PR — this file
 * locks down the interface other services depend on.
 */
@Injectable()
export class MomoService {
  private readonly logger = new Logger(MomoService.name);
  private readonly isDev: boolean;

  constructor(private readonly config: ConfigService) {
    this.isDev = (config.get<string>('nodeEnv') ?? 'development') !== 'production';
  }

  async requestToPay(req: MomoCollectRequest): Promise<MomoTxResult> {
    if (this.isDev) {
      this.logger.log(`[dev-momo] collect ${req.amount} ${req.currency} from ${req.payerPhone} (ref=${req.externalReference})`);
      return {
        referenceId: randomUUID(),
        status: 'SUCCESSFUL',
        externalReference: req.externalReference,
      };
    }
    // TODO: production — POST /collection/v1_0/requesttopay against MoMo Open API
    throw new Error('MoMo live API not yet implemented');
  }

  async disburse(req: MomoDisburseRequest): Promise<MomoTxResult> {
    if (this.isDev) {
      this.logger.log(`[dev-momo] disburse ${req.amount} ${req.currency} to ${req.payeePhone} (ref=${req.externalReference})`);
      return {
        referenceId: randomUUID(),
        status: 'SUCCESSFUL',
        externalReference: req.externalReference,
      };
    }
    // TODO: production — POST /disbursement/v1_0/transfer
    throw new Error('MoMo live API not yet implemented');
  }

  async getTxStatus(referenceId: string): Promise<MomoTxStatus> {
    if (this.isDev) return 'SUCCESSFUL';
    // TODO: production — GET /collection/v1_0/requesttopay/{referenceId}
    throw new Error('MoMo live API not yet implemented');
  }
}
