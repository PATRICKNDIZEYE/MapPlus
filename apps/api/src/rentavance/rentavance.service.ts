import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  rentavanceAdvances, rentavanceRepayments, leaseContracts, tenants,
  piggyboxWallets,
} from '@mallguide/shared';
import type { JwtPayload } from '@mallguide/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { MomoService } from '../payments/momo.service';
import { PlatformConfigService } from '../platform/platform-config.service';

/** Fallbacks if platform_config rows aren't set — defaults seeded by migration 0007. */
const FALLBACK_SAVINGS_THRESHOLD_PCT = 0.60;
const FALLBACK_MAX_COVERAGE_PCT      = 0.40;
const FALLBACK_INTEREST_RATE         = 0.03;
const FALLBACK_MIN_LEASE_AGE_DAYS    = 90;

const ACCOUNTS_ROLES = ['super_admin', 'org_owner', 'building_manager', 'accounts'];

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  monthlyRent?: number;
  currency?: string;
  currentSavings?: number;
  requiredSavings?: number;
  maxAdvanceAmount?: number;
  hasActiveAdvance?: boolean;
}

@Injectable()
export class RentAvanceService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly momo: MomoService,
    private readonly platformConfig: PlatformConfigService,
  ) {}

  /** Resolve runtime tunables from platform_config (cached 60s). */
  private async getTunables() {
    const [savingsPct, coveragePct, interestRate, minLeaseAge] = await Promise.all([
      this.platformConfig.getNumber('rentavance_min_savings_pct',  FALLBACK_SAVINGS_THRESHOLD_PCT),
      this.platformConfig.getNumber('rentavance_max_coverage_pct', FALLBACK_MAX_COVERAGE_PCT),
      this.platformConfig.getNumber('rentavance_interest_rate',    FALLBACK_INTEREST_RATE),
      this.platformConfig.getNumber('min_lease_age_days',          FALLBACK_MIN_LEASE_AGE_DAYS),
    ]);
    return { savingsPct, coveragePct, interestRate, minLeaseAge };
  }

  async checkEligibility(tenantId: string): Promise<EligibilityResult> {
    // Active contract → defines rent + lease age
    const [contract] = await this.db.db
      .select()
      .from(leaseContracts)
      .where(and(eq(leaseContracts.tenantId, tenantId), eq(leaseContracts.status, 'active')))
      .orderBy(desc(leaseContracts.createdAt))
      .limit(1);

    if (!contract) return { eligible: false, reason: 'No active lease' };

    const { savingsPct, coveragePct, minLeaseAge } = await this.getTunables();

    const leaseStartDate = new Date(contract.leaseStart);
    const ageDays = (Date.now() - leaseStartDate.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < minLeaseAge) {
      return {
        eligible: false,
        reason: `Lease must be active at least ${minLeaseAge} days (currently ${Math.floor(ageDays)})`,
      };
    }

    // Wallet balance
    const [wallet] = await this.db.db
      .select()
      .from(piggyboxWallets)
      .where(eq(piggyboxWallets.tenantId, tenantId))
      .limit(1);
    const currentSavings = wallet ? Number(wallet.balance) : 0;

    const monthlyRent     = Number(contract.monthlyRent);
    const requiredSavings = monthlyRent * savingsPct;
    const maxAdvanceAmount = monthlyRent * coveragePct;

    const base = {
      monthlyRent, currency: contract.currency,
      currentSavings, requiredSavings, maxAdvanceAmount,
    };

    if (currentSavings < requiredSavings) {
      return {
        ...base,
        eligible: false,
        reason: `Need at least ${(savingsPct * 100).toFixed(0)}% of rent saved (${requiredSavings.toFixed(0)} ${contract.currency})`,
      };
    }

    // Any active or defaulted advance blocks new requests.
    const [active] = await this.db.db
      .select({ id: rentavanceAdvances.id, status: rentavanceAdvances.status })
      .from(rentavanceAdvances)
      .where(and(
        eq(rentavanceAdvances.tenantId, tenantId),
        inArray(rentavanceAdvances.status, ['requested', 'approved', 'disbursed', 'repaying', 'defaulted']),
      ))
      .limit(1);

    if (active) {
      return {
        ...base,
        eligible: false,
        hasActiveAdvance: true,
        reason: `You have an active advance (${active.status}); repay it first.`,
      };
    }

    return { ...base, eligible: true };
  }

  async requestAdvance(tenantId: string, amount: number) {
    const elig = await this.checkEligibility(tenantId);
    if (!elig.eligible) throw new BadRequestException(elig.reason ?? 'Not eligible');
    if (amount <= 0 || amount > (elig.maxAdvanceAmount ?? 0)) {
      throw new BadRequestException(`Amount must be between 0 and ${elig.maxAdvanceAmount?.toFixed(0)}`);
    }

    const [contract] = await this.db.db
      .select()
      .from(leaseContracts)
      .where(and(eq(leaseContracts.tenantId, tenantId), eq(leaseContracts.status, 'active')))
      .orderBy(desc(leaseContracts.createdAt))
      .limit(1);
    if (!contract) throw new NotFoundException('Active contract not found');

    const { interestRate } = await this.getTunables();
    const interestAmount = amount * interestRate;
    const totalDue       = amount + interestAmount;

    const [row] = await this.db.db.insert(rentavanceAdvances).values({
      tenantId,
      contractId:    contract.id,
      amountAdvanced: amount.toFixed(2),
      interestRate:   interestRate.toFixed(4),
      interestAmount: interestAmount.toFixed(2),
      totalDue:       totalDue.toFixed(2),
      currency:       contract.currency,
      status:         'requested',
    }).returning();
    if (!row) throw new Error('Failed to create advance');

    // Notify accounts team to review.
    const reviewers = await this.db.db.execute<{ id: string }>(
      sql`SELECT id FROM users WHERE role IN ('super_admin', 'org_owner', 'building_manager', 'accounts')`,
    );
    for (const u of reviewers.rows) {
      await this.notifications.create({
        userId: u.id,
        category: 'advance_approved',
        title: 'New RentAvance request',
        body: `Amount: ${amount.toFixed(0)} ${contract.currency}`,
        href: `/admin/advances/${row.id}`,
        meta: { advanceId: row.id, tenantId },
      });
    }

    return row;
  }

  async approve(advanceId: string, collateralNotes: string, caller: JwtPayload) {
    if (!ACCOUNTS_ROLES.includes(caller.role)) {
      throw new ForbiddenException('Only the accounts team can approve advances');
    }
    const [row] = await this.db.db
      .update(rentavanceAdvances)
      .set({
        status:          'approved',
        approvedBy:      caller.sub,
        approvedAt:      new Date(),
        collateralNotes,
        updatedAt:       new Date(),
      })
      .where(and(eq(rentavanceAdvances.id, advanceId), eq(rentavanceAdvances.status, 'requested')))
      .returning();
    if (!row) throw new NotFoundException('Pending advance not found');

    await this.notifyTenant(row.tenantId, 'advance_approved',
      'RentAvance approved', `Your advance of ${row.amountAdvanced} ${row.currency} was approved.`,
      `/tenant/advance/${row.id}`, { advanceId: row.id });

    return row;
  }

  async reject(advanceId: string, caller: JwtPayload) {
    if (!ACCOUNTS_ROLES.includes(caller.role)) {
      throw new ForbiddenException('Only the accounts team can reject advances');
    }
    const [row] = await this.db.db
      .update(rentavanceAdvances)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(and(eq(rentavanceAdvances.id, advanceId), eq(rentavanceAdvances.status, 'requested')))
      .returning();
    if (!row) throw new NotFoundException('Pending advance not found');

    await this.notifyTenant(row.tenantId, 'system',
      'RentAvance not approved', `Your advance request was declined.`,
      `/tenant/advance`, { advanceId: row.id });

    return row;
  }

  /**
   * Disburse the advance to the landlord via MoMo. The dev driver returns
   * SUCCESSFUL immediately; production wiring lives in MomoService.
   */
  async disburse(advanceId: string, caller: JwtPayload) {
    if (!ACCOUNTS_ROLES.includes(caller.role)) {
      throw new ForbiddenException('Only the accounts team can disburse');
    }

    const [advance] = await this.db.db
      .select()
      .from(rentavanceAdvances)
      .where(eq(rentavanceAdvances.id, advanceId))
      .limit(1);
    if (!advance) throw new NotFoundException('Advance not found');
    if (advance.status !== 'approved') {
      throw new BadRequestException('Only approved advances can be disbursed');
    }

    // Look up the landlord (org owner) phone — fallback to "+250000000000" in dev.
    // Real wiring would pull from organizations.contactPhone.
    const tx = await this.momo.disburse({
      payeePhone: '+250000000000',
      amount:     Number(advance.amountAdvanced),
      currency:   advance.currency,
      externalReference: advance.id,
      message: `RentAvance disbursement for advance ${advance.id}`,
    });

    const dueBy = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    const [row] = await this.db.db
      .update(rentavanceAdvances)
      .set({
        status:       'disbursed',
        disbursedAt:  new Date(),
        dueBy,
        updatedAt:    new Date(),
      })
      .where(eq(rentavanceAdvances.id, advanceId))
      .returning();

    await this.notifyTenant(advance.tenantId, 'advance_disbursed',
      'RentAvance disbursed',
      `${advance.amountAdvanced} ${advance.currency} paid to your landlord. Total to repay: ${advance.totalDue} by ${dueBy}.`,
      `/tenant/advance/${advance.id}`,
      { advanceId: advance.id, momoTxId: tx.referenceId });

    return row!;
  }

  async repaymentSchedule(advanceId: string) {
    const [advance] = await this.db.db
      .select()
      .from(rentavanceAdvances)
      .where(eq(rentavanceAdvances.id, advanceId))
      .limit(1);
    if (!advance) throw new NotFoundException('Advance not found');

    const repayments = await this.db.db
      .select()
      .from(rentavanceRepayments)
      .where(eq(rentavanceRepayments.advanceId, advanceId))
      .orderBy(desc(rentavanceRepayments.paidAt));

    const repaid     = repayments.reduce((s, r) => s + Number(r.amount), 0);
    const outstanding = Math.max(0, Number(advance.totalDue) - repaid);

    return { advance, repayments, repaid, outstanding };
  }

  async listByTenant(tenantId: string) {
    return this.db.db
      .select()
      .from(rentavanceAdvances)
      .where(eq(rentavanceAdvances.tenantId, tenantId))
      .orderBy(desc(rentavanceAdvances.createdAt));
  }

  async listPending() {
    return this.db.db
      .select({
        id:             rentavanceAdvances.id,
        tenantId:       rentavanceAdvances.tenantId,
        tenantName:     tenants.tradeName,
        amountAdvanced: rentavanceAdvances.amountAdvanced,
        interestAmount: rentavanceAdvances.interestAmount,
        totalDue:       rentavanceAdvances.totalDue,
        currency:       rentavanceAdvances.currency,
        status:         rentavanceAdvances.status,
        createdAt:      rentavanceAdvances.createdAt,
      })
      .from(rentavanceAdvances)
      .leftJoin(tenants, eq(tenants.id, rentavanceAdvances.tenantId))
      .where(inArray(rentavanceAdvances.status, ['requested', 'approved']))
      .orderBy(desc(rentavanceAdvances.createdAt));
  }

  private async notifyTenant(
    tenantId: string,
    category: 'advance_approved' | 'advance_disbursed' | 'advance_repaid' | 'system',
    title: string,
    body: string,
    href: string,
    meta: Record<string, unknown>,
  ) {
    const recipients = await this.db.db.execute<{ id: string }>(
      sql`SELECT id FROM users WHERE tenant_id = ${tenantId} AND role IN ('tenant_admin', 'tenant_staff')`,
    );
    for (const r of recipients.rows) {
      await this.notifications.create({ userId: r.id, category, title, body, href, meta });
    }
  }
}
