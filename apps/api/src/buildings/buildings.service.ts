import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { buildings, floors, units } from '@mapplus/shared';
import type { NewBuilding } from '@mapplus/shared';

@Injectable()
export class BuildingsService {
  constructor(private db: DatabaseService) {}

  async findAll(orgId?: string) {
    const query = this.db.db.select().from(buildings);
    if (orgId) {
      return query.where(eq(buildings.orgId, orgId));
    }
    return query.where(eq(buildings.isPublic, true));
  }

  async findById(id: string) {
    const [building] = await this.db.db
      .select()
      .from(buildings)
      .where(eq(buildings.id, id))
      .limit(1);

    if (!building) throw new NotFoundException(`Building ${id} not found`);
    return building;
  }

  async findBySlug(slug: string) {
    const [building] = await this.db.db
      .select()
      .from(buildings)
      .where(eq(buildings.slug, slug))
      .limit(1);

    if (!building) throw new NotFoundException(`Building "${slug}" not found`);
    return building;
  }

  async create(data: NewBuilding) {
    const [building] = await this.db.db.insert(buildings).values(data).returning();
    return building!;
  }

  async update(id: string, data: Partial<NewBuilding>) {
    const [building] = await this.db.db
      .update(buildings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(buildings.id, id))
      .returning();

    if (!building) throw new NotFoundException(`Building ${id} not found`);
    return building;
  }

  async getFloors(buildingId: string) {
    return this.db.db
      .select()
      .from(floors)
      .where(eq(floors.buildingId, buildingId))
      .orderBy(floors.floorNumber);
  }

  async getFloorWithUnits(floorId: string) {
    const [floor] = await this.db.db
      .select()
      .from(floors)
      .where(eq(floors.id, floorId))
      .limit(1);

    if (!floor) throw new NotFoundException(`Floor ${floorId} not found`);

    const floorUnits = await this.db.db
      .select()
      .from(units)
      .where(eq(units.floorId, floorId));

    return { floor, units: floorUnits };
  }
}
