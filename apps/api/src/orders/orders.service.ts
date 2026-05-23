import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger,
} from '@nestjs/common';
import { eq, and, or, desc, sql, type SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  orders, products, shopProfiles, tenants, buildings, units,
} from '@mallguide/shared';
import type { JwtPayload, NewOrder } from '@mallguide/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { MomoService } from '../payments/momo.service';
import { PiggyBoxService } from '../piggybox/piggybox.service';
import { PlatformConfigService } from '../platform/platform-config.service';

type OrderStatus =
  | 'requested' | 'accepted' | 'picked_up' | 'in_delivery'
  | 'delivered' | 'paid' | 'returned' | 'cancelled';

/** Fallback if platform_config.default_delivery_fee_rwf isn't set. */
const FALLBACK_DELIVERY_FEE_RWF = 1500;

const STAFF_ROLES = ['super_admin', 'org_owner', 'building_manager'];

interface CreateInput {
  productId: string;
  quantity?: number;
  // Anonymous-shopper context (QR session)
  shopperSessionId?: string;
  shopperName: string;
  shopperPhone: string;
  // MoMo payer phone for the delivery fee (defaults to shopperPhone).
  payerPhone?: string;
  deliveryAddress: string;
  deliveryNotes?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly momo: MomoService,
    private readonly piggybox: PiggyBoxService,
    private readonly platformConfig: PlatformConfigService,
  ) {}

  /**
   * Create a Buy & Try order. Charges the flat delivery fee via MoMo, marks
   * the order `requested`, and notifies the tenant.
   */
  async create(input: CreateInput, caller?: JwtPayload | null) {
    const quantity = input.quantity ?? 1;

    const [product] = await this.db.db
      .select({
        id:        products.id,
        tenantId:  products.tenantId,
        shopId:    products.shopId,
        name:      products.name,
        priceAmount: products.priceAmount,
        currency:    products.currency,
        stockCount:  products.stockCount,
        isPublished: products.isPublished,
        isBuyAndTryEligible: products.isBuyAndTryEligible,
      })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);
    if (!product) throw new NotFoundException('Product not found');
    if (!product.isPublished) throw new BadRequestException('Product is not available');
    if (!product.isBuyAndTryEligible) throw new BadRequestException('Product is not eligible for Buy & Try');
    if (product.stockCount < quantity) throw new BadRequestException('Insufficient stock');
    if (!product.tenantId) throw new BadRequestException('Product is not linked to a tenant');

    // Resolve the building via the shop's unit.
    const [shop] = await this.db.db
      .select({
        unitId:     shopProfiles.unitId,
      })
      .from(shopProfiles)
      .where(eq(shopProfiles.id, product.shopId))
      .limit(1);
    if (!shop) throw new NotFoundException('Shop not found');

    const [unitRow] = await this.db.db
      .select({ buildingId: units.buildingId })
      .from(units)
      .where(eq(units.id, shop.unitId))
      .limit(1);
    if (!unitRow) throw new NotFoundException('Unit not found');

    const unitPrice    = Number(product.priceAmount ?? 0);
    const deliveryFee  = await this.platformConfig.getNumber(
      'default_delivery_fee_rwf', FALLBACK_DELIVERY_FEE_RWF,
    );
    const totalAmount  = unitPrice * quantity + deliveryFee;
    const currency     = product.currency ?? 'RWF';

    // Collect the delivery fee up front via MoMo.
    const payerPhone = input.payerPhone ?? input.shopperPhone;
    const txRef      = `dlv-${Date.now()}`;
    const tx = await this.momo.requestToPay({
      payerPhone,
      amount:   deliveryFee,
      currency,
      externalReference: txRef,
      payeeNote: `Buy & Try delivery fee · ${product.name}`,
    });
    if (tx.status !== 'SUCCESSFUL') {
      throw new BadRequestException('Delivery fee payment failed — please retry');
    }

    const [order] = await this.db.db.insert(orders).values({
      shopperUserId:    caller?.sub ?? null,
      shopperSessionId: input.shopperSessionId ?? null,
      shopperName:      input.shopperName,
      shopperPhone:     input.shopperPhone,

      tenantId:   product.tenantId,
      productId:  product.id,
      buildingId: unitRow.buildingId,

      quantity,
      unitPrice:   unitPrice.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      currency,

      deliveryAddress: input.deliveryAddress,
      deliveryNotes:   input.deliveryNotes ?? null,
      status:          'requested',
    }).returning();
    if (!order) throw new Error('Failed to create order');

    // Notify tenant staff
    await this.notifyTenantUsers(product.tenantId, 'order_status',
      `New Buy & Try order: ${product.name}`,
      `${input.shopperName} (${input.shopperPhone}) · ${input.deliveryAddress}`,
      `/tenant/orders/${order.id}`,
      { orderId: order.id, productId: product.id });

    return order;
  }

  async byId(id: string) {
    const rows = await this.db.db
      .select({
        id: orders.id,
        shopperUserId: orders.shopperUserId,
        shopperSessionId: orders.shopperSessionId,
        shopperName: orders.shopperName,
        shopperPhone: orders.shopperPhone,
        tenantId: orders.tenantId,
        tenantName: tenants.tradeName,
        productId: orders.productId,
        productName: products.name,
        productImage: products.imageUrl,
        buildingId: orders.buildingId,
        quantity: orders.quantity,
        unitPrice: orders.unitPrice,
        deliveryFee: orders.deliveryFee,
        totalAmount: orders.totalAmount,
        currency: orders.currency,
        deliveryAddress: orders.deliveryAddress,
        deliveryNotes: orders.deliveryNotes,
        status: orders.status,
        requestedAt: orders.requestedAt,
        pickedUpAt:  orders.pickedUpAt,
        deliveredAt: orders.deliveredAt,
        paidAt:      orders.paidAt,
        returnedAt:  orders.returnedAt,
        cancelledAt: orders.cancelledAt,
      })
      .from(orders)
      .leftJoin(tenants, eq(tenants.id, orders.tenantId))
      .leftJoin(products, eq(products.id, orders.productId))
      .where(eq(orders.id, id))
      .limit(1);

    const order = rows[0];
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async byShopper(sessionId: string | null, userId: string | null) {
    if (!sessionId && !userId) return [];
    const conds: SQL[] = [];
    if (sessionId) conds.push(eq(orders.shopperSessionId, sessionId));
    if (userId)    conds.push(eq(orders.shopperUserId, userId));

    return this.db.db
      .select({
        id: orders.id,
        productId: orders.productId,
        productName: products.name,
        productImage: products.imageUrl,
        tenantId: orders.tenantId,
        tenantName: tenants.tradeName,
        status: orders.status,
        totalAmount: orders.totalAmount,
        currency: orders.currency,
        requestedAt: orders.requestedAt,
      })
      .from(orders)
      .leftJoin(products, eq(products.id, orders.productId))
      .leftJoin(tenants, eq(tenants.id, orders.tenantId))
      .where(conds.length === 1 ? conds[0] : or(...conds))
      .orderBy(desc(orders.requestedAt));
  }

  async byTenant(tenantId: string, status?: OrderStatus) {
    const conds: SQL[] = [eq(orders.tenantId, tenantId)];
    if (status) conds.push(eq(orders.status, status));

    return this.db.db
      .select({
        id: orders.id,
        productId: orders.productId,
        productName: products.name,
        shopperName: orders.shopperName,
        shopperPhone: orders.shopperPhone,
        deliveryAddress: orders.deliveryAddress,
        status: orders.status,
        quantity: orders.quantity,
        totalAmount: orders.totalAmount,
        deliveryFee: orders.deliveryFee,
        currency: orders.currency,
        requestedAt: orders.requestedAt,
        deliveredAt: orders.deliveredAt,
      })
      .from(orders)
      .leftJoin(products, eq(products.id, orders.productId))
      .where(and(...conds))
      .orderBy(desc(orders.requestedAt));
  }

  // ─── Status transitions ─────────────────────────────────────────────────

  private async assertTenantOwnership(orderId: string, caller: JwtPayload) {
    const [row] = await this.db.db
      .select({ id: orders.id, tenantId: orders.tenantId })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!row) throw new NotFoundException('Order not found');
    if (!STAFF_ROLES.includes(caller.role) && caller.tenantId !== row.tenantId) {
      throw new ForbiddenException('Not authorized for this order');
    }
    return row;
  }

  async acceptByTenant(orderId: string, caller: JwtPayload) {
    await this.assertTenantOwnership(orderId, caller);
    const [row] = await this.db.db
      .update(orders)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, 'requested')))
      .returning();
    if (!row) throw new BadRequestException('Order not in requested state');
    return row;
  }

  async markDelivered(orderId: string, caller: JwtPayload) {
    // Delivery personnel + admins can mark delivered.
    const allowed = [...STAFF_ROLES, 'delivery_personnel', 'building_manager', 'floor_manager'];
    if (!allowed.includes(caller.role)) {
      throw new ForbiddenException('Only delivery staff can mark delivered');
    }
    const [row] = await this.db.db
      .update(orders)
      .set({ status: 'delivered', deliveredAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    if (!row) throw new NotFoundException('Order not found');

    await this.notifyShopper(row.shopperUserId, row.shopperSessionId,
      'order_status', 'Your order has arrived',
      `Inspect and pay, or return — your call.`,
      `/orders/${row.id}`, { orderId: row.id });

    return row;
  }

  /**
   * Shopper pays the full amount in person. We collect via MoMo, mark `paid`,
   * and deposit the product price (totalAmount − deliveryFee) to the tenant's
   * PiggyBox. PiggyBox auto-routes that to active RentAvance repayment if any.
   */
  async markPaid(orderId: string, payerPhone: string) {
    const [order] = await this.db.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'delivered') {
      throw new BadRequestException('Only delivered orders can be marked paid');
    }

    const productAmount = Number(order.totalAmount) - Number(order.deliveryFee);
    const tx = await this.momo.requestToPay({
      payerPhone,
      amount:   productAmount,
      currency: order.currency,
      externalReference: order.id,
      payeeNote: 'Buy & Try payment',
    });
    if (tx.status !== 'SUCCESSFUL') {
      throw new BadRequestException('Payment failed — please retry');
    }

    const [updated] = await this.db.db
      .update(orders)
      .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    // Auto-deposit to tenant's PiggyBox — also triggers RentAvance auto-deduct.
    await this.piggybox.deposit({
      tenantId: order.tenantId,
      amount:   productAmount,
      source:   'sale',
      referenceId: order.id,
      note:     `Sale: order ${order.id.slice(0, 8)}`,
    });

    // Decrement stock
    await this.db.db
      .update(products)
      .set({ stockCount: sql`GREATEST(${products.stockCount} - ${order.quantity}, 0)`, updatedAt: new Date() })
      .where(eq(products.id, order.productId));

    return updated!;
  }

  async returnRequest(orderId: string, reason?: string) {
    const [order] = await this.db.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'delivered') {
      throw new BadRequestException('Only delivered orders can be returned');
    }

    const [updated] = await this.db.db
      .update(orders)
      .set({
        status:     'returned',
        returnedAt: new Date(),
        deliveryNotes: reason ?? order.deliveryNotes,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    await this.notifyTenantUsers(order.tenantId, 'order_status',
      'Order returned',
      reason ?? 'Shopper rejected on delivery.',
      `/tenant/orders/${order.id}`,
      { orderId: order.id });

    return updated!;
  }

  async cancel(orderId: string, caller: JwtPayload | null, sessionId?: string) {
    const [order] = await this.db.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) throw new NotFoundException('Order not found');

    const canCancel =
      caller && (STAFF_ROLES.includes(caller.role) || caller.tenantId === order.tenantId || caller.sub === order.shopperUserId)
      || (sessionId && sessionId === order.shopperSessionId);
    if (!canCancel) throw new ForbiddenException('Not authorized to cancel');

    if (['picked_up', 'in_delivery', 'delivered', 'paid', 'returned'].includes(order.status)) {
      throw new BadRequestException('Cannot cancel after pickup');
    }

    const [updated] = await this.db.db
      .update(orders)
      .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return updated!;
  }

  // ─── Notification helpers ───────────────────────────────────────────────

  private async notifyTenantUsers(
    tenantId: string,
    category: 'order_status',
    title: string,
    body: string,
    href: string,
    meta: Record<string, unknown>,
  ) {
    const rows = await this.db.db.execute<{ id: string }>(
      sql`SELECT id FROM users WHERE tenant_id = ${tenantId} AND role IN ('tenant_admin', 'tenant_staff')`,
    );
    for (const r of rows.rows) {
      await this.notifications.create({ userId: r.id, category, title, body, href, meta });
    }
  }

  private async notifyShopper(
    userId: string | null,
    sessionId: string | null,
    category: 'order_status',
    title: string,
    body: string,
    href: string,
    meta: Record<string, unknown>,
  ) {
    // Only signed-in shoppers receive in-app notifications; anonymous sessions
    // would need push tokens, which Phase 6 doesn't yet wire.
    if (!userId) return;
    await this.notifications.create({ userId, category, title, body, href, meta });
  }
}
