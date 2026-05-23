import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, desc, sql, inArray, type SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { incidents, users } from '@mallguide/shared';
import type { NewIncident } from '@mallguide/shared';
import { NotificationsService } from '../notifications/notifications.service';

type IncidentType = 'security' | 'maintenance' | 'cleaning' | 'safety' | 'other';
type IncidentStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

interface ListFilters {
  buildingId?: string;
  status?: IncidentStatus[];
  type?: IncidentType[];
  assignedTo?: string;
}

@Injectable()
export class IncidentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(input: NewIncident) {
    const [row] = await this.db.db.insert(incidents).values(input).returning();
    if (!row) throw new Error('Failed to create incident');
    return row;
  }

  async list(filters: ListFilters = {}) {
    const conds: SQL[] = [];
    if (filters.buildingId) conds.push(eq(incidents.buildingId, filters.buildingId));
    if (filters.status?.length) conds.push(inArray(incidents.status, filters.status));
    if (filters.type?.length) conds.push(inArray(incidents.type, filters.type));
    if (filters.assignedTo) conds.push(eq(incidents.assignedTo, filters.assignedTo));

    return this.db.db
      .select({
        id: incidents.id,
        buildingId: incidents.buildingId,
        floorId: incidents.floorId,
        type: incidents.type,
        status: incidents.status,
        title: incidents.title,
        description: incidents.description,
        photoUrl: incidents.photoUrl,
        location: incidents.location,
        reportedBy: incidents.reportedBy,
        assignedTo: incidents.assignedTo,
        resolvedBy: incidents.resolvedBy,
        reportedAt: incidents.reportedAt,
        assignedAt: incidents.assignedAt,
        resolvedAt: incidents.resolvedAt,
        resolutionNote: incidents.resolutionNote,
        reporterEmail: users.email,
      })
      .from(incidents)
      .leftJoin(users, eq(users.id, incidents.reportedBy))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(incidents.reportedAt));
  }

  async byId(id: string) {
    const [row] = await this.db.db.select().from(incidents).where(eq(incidents.id, id));
    if (!row) throw new NotFoundException('Incident not found');
    return row;
  }

  async assign(id: string, assigneeUserId: string) {
    const [row] = await this.db.db
      .update(incidents)
      .set({ assignedTo: assigneeUserId, assignedAt: new Date(), status: 'assigned', updatedAt: new Date() })
      .where(eq(incidents.id, id))
      .returning();
    if (!row) throw new NotFoundException('Incident not found');

    await this.notifications.create({
      userId: assigneeUserId,
      category: 'incident',
      title: `Incident assigned: ${row.title}`,
      body: row.description,
      href: `/admin/incidents/${row.id}`,
      meta: { incidentId: row.id, type: row.type },
    });

    return row;
  }

  async updateStatus(id: string, status: IncidentStatus, userId: string) {
    const patch: Partial<typeof incidents.$inferInsert> = { status, updatedAt: new Date() };
    if (status === 'resolved' || status === 'closed') {
      patch.resolvedBy = userId;
      patch.resolvedAt = new Date();
    }
    const [row] = await this.db.db
      .update(incidents)
      .set(patch)
      .where(eq(incidents.id, id))
      .returning();
    if (!row) throw new NotFoundException('Incident not found');
    return row;
  }

  async resolve(id: string, userId: string, resolutionNote: string) {
    const [row] = await this.db.db
      .update(incidents)
      .set({
        status: 'resolved',
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionNote,
        updatedAt: new Date(),
      })
      .where(eq(incidents.id, id))
      .returning();
    if (!row) throw new NotFoundException('Incident not found');
    return row;
  }

  async summary(buildingId: string) {
    const rows = await this.db.db
      .select({
        status: incidents.status,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(incidents)
      .where(eq(incidents.buildingId, buildingId))
      .groupBy(incidents.status);

    const summary: Record<string, number> = {};
    for (const r of rows) summary[r.status] = r.count;
    return summary;
  }
}
