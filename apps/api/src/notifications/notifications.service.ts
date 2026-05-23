import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { notifications } from '@mallguide/shared';
import type { NewNotification } from '@mallguide/shared';

/**
 * Notifications service — in-app feed plus a pluggable email driver.
 * Phase 1 lands the infrastructure; later phases call `create()` from rent
 * cron, advance approval, order status transitions, and delivery updates.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly db: DatabaseService) {}

  async create(input: NewNotification): Promise<void> {
    await this.db.db.insert(notifications).values(input);
    // Email driver stub — wire to Resend / SES in a later phase.
    this.logger.debug(`[notify ${input.category}] ${input.title} (user=${input.userId})`);
  }

  async listForUser(userId: string, limit = 50) {
    return this.db.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async unreadCount(userId: string): Promise<number> {
    const rows = await this.db.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return rows.length;
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.db.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }
}
