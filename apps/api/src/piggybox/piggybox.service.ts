import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  piggyboxWallets, piggyboxTransactions, tenants, leaseContracts,
  rentavanceAdvances, rentavanceRepayments,
} from '@mallguide/shared';
import type { PiggyboxWallet } from '@mallguide/shared';
import { NotificationsService } from '../notifications/notifications.service';

type DepositSource = 'manual' | 'sale' | 'system';

interface DepositInput {
  tenantId: string;
  amount: number;
  source: DepositSource;
  note?: string;
  referenceId?: string;
}

@Injectable()
export class PiggyBoxService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Fetch or lazily create the wallet for a tenant. We seed `rentDueDay` and
   * a sensible `lockedUntil` from the active lease contract on creation so the
   * cron job can use the wallet as the source of truth.
   */
  async getOrCreateWallet(tenantId: string): Promise<PiggyboxWallet> {
    const [existing] = await this.db.db
      .select()
      .from(piggyboxWallets)
      .where(eq(piggyboxWallets.tenantId, tenantId))
      .limit(1);
    if (existing) return existing;

    // Pull rentDueDay from the latest active contract if available.
    const [contract] = await this.db.db
      .select({ rentDueDay: leaseContracts.rentDueDay, currency: leaseContracts.currency })
      .from(leaseContracts)
      .where(and(eq(leaseContracts.tenantId, tenantId), eq(leaseContracts.status, 'active')))
      .orderBy(desc(leaseContracts.createdAt))
      .limit(1);

    const [created] = await this.db.db.insert(piggyboxWallets).values({
      tenantId,
      currency: contract?.currency ?? 'RWF',
      rentDueDay: contract?.rentDueDay ?? 1,
    }).returning();
    if (!created) throw new Error('Failed to create wallet');
    return created;
  }

  async balance(tenantId: string) {
    const wallet = await this.getOrCreateWallet(tenantId);

    // Pull the active rent target so the UI can render progress-to-rent.
    const [contract] = await this.db.db
      .select({
        monthlyRent: leaseContracts.monthlyRent,
        currency:    leaseContracts.currency,
        rentDueDay:  leaseContracts.rentDueDay,
      })
      .from(leaseContracts)
      .where(and(eq(leaseContracts.tenantId, tenantId), eq(leaseContracts.status, 'active')))
      .orderBy(desc(leaseContracts.createdAt))
      .limit(1);

    const monthlyRent = contract ? Number(contract.monthlyRent) : null;
    const balance     = Number(wallet.balance);
    const savedPct    = monthlyRent && monthlyRent > 0
      ? Math.min(1, balance / monthlyRent)
      : null;

    // Active advance — if one exists, the tenant is in the repayment window.
    const [activeAdvance] = await this.db.db
      .select({
        id: rentavanceAdvances.id,
        totalDue: rentavanceAdvances.totalDue,
        status:   rentavanceAdvances.status,
        dueBy:    rentavanceAdvances.dueBy,
      })
      .from(rentavanceAdvances)
      .where(and(
        eq(rentavanceAdvances.tenantId, tenantId),
        sql`${rentavanceAdvances.status} IN ('disbursed', 'repaying')`,
      ))
      .orderBy(desc(rentavanceAdvances.createdAt))
      .limit(1);

    return {
      wallet,
      monthlyRent,
      savedPct,
      activeAdvance: activeAdvance ?? null,
    };
  }

  /**
   * Record a deposit. If the tenant has an active RentAvance in the repayment
   * window, the deposit is routed to repayment first (interest+principal),
   * with any remainder credited to the wallet balance.
   */
  async deposit(input: DepositInput) {
    if (input.amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getOrCreateWallet(input.tenantId);

    // Check for an active advance to auto-deduct.
    const [activeAdvance] = await this.db.db
      .select()
      .from(rentavanceAdvances)
      .where(and(
        eq(rentavanceAdvances.tenantId, input.tenantId),
        sql`${rentavanceAdvances.status} IN ('disbursed', 'repaying')`,
      ))
      .orderBy(desc(rentavanceAdvances.createdAt))
      .limit(1);

    let remainingForWallet = input.amount;

    if (activeAdvance) {
      const repaid = await this.db.db
        .select({ total: sql<string>`COALESCE(SUM(${rentavanceRepayments.amount}), 0)::text` })
        .from(rentavanceRepayments)
        .where(eq(rentavanceRepayments.advanceId, activeAdvance.id));
      const alreadyRepaid = Number(repaid[0]?.total ?? '0');
      const outstanding   = Number(activeAdvance.totalDue) - alreadyRepaid;

      if (outstanding > 0) {
        const repayAmount = Math.min(outstanding, input.amount);
        await this.db.db.insert(rentavanceRepayments).values({
          advanceId: activeAdvance.id,
          amount:    repayAmount.toFixed(2),
          currency:  activeAdvance.currency,
        });

        // Log the repayment as a wallet transaction too so the timeline is complete.
        await this.db.db.insert(piggyboxTransactions).values({
          walletId: wallet.id,
          type:    'advance_repayment',
          source:  input.source,
          amount:  repayAmount.toFixed(2),
          currency: wallet.currency,
          referenceId: activeAdvance.id,
          note: `Auto-applied to advance`,
        });

        const fullyRepaid = (alreadyRepaid + repayAmount) >= Number(activeAdvance.totalDue);
        await this.db.db
          .update(rentavanceAdvances)
          .set({
            status:    fullyRepaid ? 'repaid' : 'repaying',
            repaidAt:  fullyRepaid ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(rentavanceAdvances.id, activeAdvance.id));

        if (fullyRepaid) {
          const recipients = await this.db.db.execute<{ id: string }>(
            sql`SELECT id FROM users WHERE tenant_id = ${input.tenantId} AND role IN ('tenant_admin', 'tenant_staff')`,
          );
          for (const r of recipients.rows) {
            await this.notifications.create({
              userId: r.id,
              category: 'advance_repaid',
              title: 'RentAvance repaid in full',
              body: `${activeAdvance.totalDue} ${activeAdvance.currency} cleared.`,
              href: '/tenant/advance',
              meta: { advanceId: activeAdvance.id },
            });
          }
        }

        remainingForWallet = input.amount - repayAmount;
      }
    }

    if (remainingForWallet > 0) {
      // Record a wallet-deposit transaction and increment balance + lockedBalance.
      await this.db.db.insert(piggyboxTransactions).values({
        walletId: wallet.id,
        type:     'deposit',
        source:   input.source,
        amount:   remainingForWallet.toFixed(2),
        currency: wallet.currency,
        referenceId: input.referenceId,
        note: input.note,
      });

      await this.db.db
        .update(piggyboxWallets)
        .set({
          balance:       sql`${piggyboxWallets.balance} + ${remainingForWallet}`,
          lockedBalance: sql`${piggyboxWallets.lockedBalance} + ${remainingForWallet}`,
          updatedAt: new Date(),
        })
        .where(eq(piggyboxWallets.id, wallet.id));
    }

    return this.balance(input.tenantId);
  }

  async transactions(tenantId: string, limit = 50) {
    const wallet = await this.getOrCreateWallet(tenantId);
    return this.db.db
      .select()
      .from(piggyboxTransactions)
      .where(eq(piggyboxTransactions.walletId, wallet.id))
      .orderBy(desc(piggyboxTransactions.occurredAt))
      .limit(limit);
  }

  /**
   * Forward the entire locked balance to the landlord (rent-due day flow).
   * Returns the amount forwarded. Real MoMo disbursement happens at the caller.
   */
  async forwardToLandlord(tenantId: string) {
    const wallet = await this.getOrCreateWallet(tenantId);
    const amount = Number(wallet.balance);
    if (amount <= 0) return { amount: 0 };

    await this.db.db.insert(piggyboxTransactions).values({
      walletId: wallet.id,
      type:     'rent_forward',
      source:   'system',
      amount:   amount.toFixed(2),
      currency: wallet.currency,
      note: 'Auto-forwarded on rent due day',
    });

    await this.db.db
      .update(piggyboxWallets)
      .set({ balance: '0', lockedBalance: '0', updatedAt: new Date() })
      .where(eq(piggyboxWallets.id, wallet.id));

    return { amount, currency: wallet.currency };
  }

  /**
   * Admin-only override — reduces locked balance to allow an early withdrawal.
   */
  async forceUnlock(tenantId: string, amount: number, adminId: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getOrCreateWallet(tenantId);
    if (Number(wallet.lockedBalance) < amount) {
      throw new BadRequestException('Cannot unlock more than the locked balance');
    }

    await this.db.db.insert(piggyboxTransactions).values({
      walletId: wallet.id,
      type:     'withdraw',
      source:   'system',
      amount:   amount.toFixed(2),
      currency: wallet.currency,
      referenceId: adminId,
      note: 'Admin force-unlock',
    });

    await this.db.db
      .update(piggyboxWallets)
      .set({
        balance:       sql`${piggyboxWallets.balance} - ${amount}`,
        lockedBalance: sql`${piggyboxWallets.lockedBalance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(piggyboxWallets.id, wallet.id));

    return this.balance(tenantId);
  }
}
