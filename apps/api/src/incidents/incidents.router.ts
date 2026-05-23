import { Injectable, ForbiddenException } from '@nestjs/common';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc.init';
import { IncidentsService } from './incidents.service';

const INCIDENT_TYPES = ['security', 'maintenance', 'cleaning', 'safety', 'other'] as const;
const INCIDENT_STATUSES = ['open', 'assigned', 'in_progress', 'resolved', 'closed'] as const;

// Roles allowed to mutate incidents — building staff + admins.
const STAFF_ROLES = [
  'super_admin', 'org_owner', 'building_manager', 'floor_manager',
  'security', 'maintenance',
];

function requireStaff(role: string) {
  if (!STAFF_ROLES.includes(role)) {
    throw new ForbiddenException('Only mall staff can manage incidents.');
  }
}

@Injectable()
export class IncidentsRouter {
  constructor(private readonly incidents: IncidentsService) {}

  get trpcRouter() {
    return router({
      list: protectedProcedure
        .input(z.object({
          buildingId: z.string().uuid().optional(),
          status:     z.array(z.enum(INCIDENT_STATUSES)).optional(),
          type:       z.array(z.enum(INCIDENT_TYPES)).optional(),
          assignedTo: z.string().uuid().optional(),
        }).optional())
        .query(({ input }) => this.incidents.list(input ?? {})),

      byId: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(({ input }) => this.incidents.byId(input.id)),

      create: protectedProcedure
        .input(z.object({
          buildingId:  z.string().uuid(),
          floorId:     z.string().uuid().nullable().optional(),
          type:        z.enum(INCIDENT_TYPES),
          title:       z.string().min(2).max(200),
          description: z.string().min(2).max(4000),
          photoUrl:    z.string().url().nullable().optional(),
          location:    z.string().max(200).nullable().optional(),
        }))
        .mutation(({ ctx, input }) =>
          this.incidents.create({
            ...input,
            reportedBy: ctx.user!.sub,
          }),
        ),

      assign: protectedProcedure
        .input(z.object({ id: z.string().uuid(), assigneeUserId: z.string().uuid() }))
        .mutation(({ ctx, input }) => {
          requireStaff(ctx.user!.role);
          return this.incidents.assign(input.id, input.assigneeUserId);
        }),

      updateStatus: protectedProcedure
        .input(z.object({ id: z.string().uuid(), status: z.enum(INCIDENT_STATUSES) }))
        .mutation(({ ctx, input }) => {
          requireStaff(ctx.user!.role);
          return this.incidents.updateStatus(input.id, input.status, ctx.user!.sub);
        }),

      resolve: protectedProcedure
        .input(z.object({
          id: z.string().uuid(),
          resolutionNote: z.string().min(2).max(2000),
        }))
        .mutation(({ ctx, input }) => {
          requireStaff(ctx.user!.role);
          return this.incidents.resolve(input.id, ctx.user!.sub, input.resolutionNote);
        }),

      summary: protectedProcedure
        .input(z.object({ buildingId: z.string().uuid() }))
        .query(({ input }) => this.incidents.summary(input.buildingId)),
    });
  }
}
