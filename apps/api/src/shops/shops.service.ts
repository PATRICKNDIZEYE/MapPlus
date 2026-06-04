import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { shopProfiles, products, units, floors } from '@mallguide/shared';
import type { JwtPayload } from '@mallguide/shared';

@Injectable()
export class ShopsService {
  constructor(private db: DatabaseService) {}

  /**
   * Return all shops belonging to the calling tenant. Used by the Tenant Hub
   * landing page so it can render the logged-in tenant's actual shop without
   * needing a shopId in the URL.
   */
  async listMine(tenantId: string) {
    return this.db.db
      .select({
        id: shopProfiles.id,
        publicName: shopProfiles.publicName,
        description: shopProfiles.description,
        category: shopProfiles.category,
        subcategory: shopProfiles.subcategory,
        tags: shopProfiles.tags,
        logoUrl: shopProfiles.logoUrl,
        coverPhotoUrl: shopProfiles.coverPhotoUrl,
        phone: shopProfiles.phone,
        whatsapp: shopProfiles.whatsapp,
        email: shopProfiles.email,
        website: shopProfiles.website,
        operatingHours: shopProfiles.operatingHours,
        verificationStatus: shopProfiles.verificationStatus,
        isPublished: shopProfiles.isPublished,
        unitId: shopProfiles.unitId,
        unitCode: units.unitCode,
        floorId: units.floorId,
        floorName: floors.name,
        floorNumber: floors.floorNumber,
      })
      .from(shopProfiles)
      .innerJoin(units, eq(units.id, shopProfiles.unitId))
      .innerJoin(floors, eq(floors.id, units.floorId))
      .where(eq(shopProfiles.tenantId, tenantId));
  }

  async findById(id: string) {
    const [shop] = await this.db.db
      .select({
        id: shopProfiles.id,
        publicName: shopProfiles.publicName,
        description: shopProfiles.description,
        category: shopProfiles.category,
        subcategory: shopProfiles.subcategory,
        tags: shopProfiles.tags,
        logoUrl: shopProfiles.logoUrl,
        coverPhotoUrl: shopProfiles.coverPhotoUrl,
        phone: shopProfiles.phone,
        whatsapp: shopProfiles.whatsapp,
        email: shopProfiles.email,
        website: shopProfiles.website,
        operatingHours: shopProfiles.operatingHours,
        verificationStatus: shopProfiles.verificationStatus,
        lastVerifiedAt: shopProfiles.lastVerifiedAt,
        unitId: shopProfiles.unitId,
        unitCode: units.unitCode,
        floorId: units.floorId,
        floorName: floors.name,
        floorNumber: floors.floorNumber,
      })
      .from(shopProfiles)
      .innerJoin(units, eq(units.id, shopProfiles.unitId))
      .innerJoin(floors, eq(floors.id, units.floorId))
      .where(and(eq(shopProfiles.id, id), eq(shopProfiles.isPublished, true)))
      .limit(1);

    if (!shop) throw new NotFoundException(`Shop ${id} not found`);

    const shopProducts = await this.db.db
      .select()
      .from(products)
      .where(and(eq(products.shopId, id), eq(products.isAvailable, true)))
      .orderBy(products.sortOrder);

    return { ...shop, products: shopProducts };
  }

  async listByBuilding(buildingId: string, floorId?: string) {
    const query = this.db.db
      .select({
        id: shopProfiles.id,
        publicName: shopProfiles.publicName,
        category: shopProfiles.category,
        logoUrl: shopProfiles.logoUrl,
        coverPhotoUrl: shopProfiles.coverPhotoUrl,
        unitId: shopProfiles.unitId,
        unitCode: units.unitCode,
        floorId: units.floorId,
        floorName: floors.name,
        floorNumber: floors.floorNumber,
      })
      .from(shopProfiles)
      .innerJoin(units, eq(units.id, shopProfiles.unitId))
      .innerJoin(floors, eq(floors.id, units.floorId))
      .where(
        and(
          eq(units.buildingId, buildingId),
          eq(shopProfiles.isPublished, true),
          ...(floorId ? [eq(units.floorId, floorId)] : []),
        ),
      );
    return query;
  }

  async updateProfile(
    id: string,
    data: {
      publicName?: string;
      description?: string;
      phone?: string;
      whatsapp?: string;
      email?: string;
      website?: string;
      operatingHours?: Record<string, unknown>;
    },
    caller: JwtPayload,
  ) {
    const [shop] = await this.db.db
      .select({ id: shopProfiles.id, tenantId: shopProfiles.tenantId })
      .from(shopProfiles)
      .where(eq(shopProfiles.id, id))
      .limit(1);

    if (!shop) throw new NotFoundException(`Shop ${id} not found`);

    const adminRoles = ['super_admin', 'org_owner', 'building_manager'];
    if (!adminRoles.includes(caller.role) && caller.tenantId !== shop.tenantId) {
      throw new ForbiddenException('You do not own this shop');
    }

    const [updated] = await this.db.db
      .update(shopProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(shopProfiles.id, id))
      .returning();

    return updated!;
  }
}
