import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { eq, or } from 'drizzle-orm';
import { OAuth2Client } from 'google-auth-library';
import { DatabaseService } from '../database/database.service';
import { users } from '@mallguide/shared';
import type { JwtPayload } from '@mallguide/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client | null = null;

  constructor(
    private db: DatabaseService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private getGoogleClient(): OAuth2Client {
    if (!this.googleClient) {
      const clientId = this.config.get<string>('google.clientId');
      if (!clientId) {
        throw new UnauthorizedException('Google sign-in is not configured on this server.');
      }
      this.googleClient = new OAuth2Client(clientId);
    }
    return this.googleClient;
  }

  /**
   * Sign in or sign up via a Google ID token issued by Google Identity Services.
   * - Verifies signature, audience (our Client ID), expiry, and issuer.
   * - Auto-links to an existing user when the email matches (verified).
   * - Auto-creates a new `public`-role user when none exists.
   */
  async loginWithGoogle(idToken: string) {
    const clientId = this.config.get<string>('google.clientId')!;
    const client   = this.getGoogleClient();

    let ticket;
    try {
      ticket = await client.verifyIdToken({ idToken, audience: clientId });
    } catch (err) {
      this.logger.warn(`Google ID token verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Google sign-in failed. Please try again.');
    }

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Google did not return a usable account.');
    }
    if (!payload.email_verified) {
      throw new UnauthorizedException('Your Google email is not verified.');
    }

    const email     = payload.email.toLowerCase();
    const googleSub = payload.sub;
    const firstName = payload.given_name  ?? null;
    const lastName  = payload.family_name ?? null;
    const avatarUrl = payload.picture     ?? null;

    // Look up by googleSub first (most stable), then by email.
    const [existing] = await this.db.db
      .select()
      .from(users)
      .where(or(eq(users.googleSub, googleSub), eq(users.email, email)))
      .limit(1);

    let user;
    if (existing) {
      if (!existing.isActive) throw new UnauthorizedException('Account is disabled.');
      // Backfill googleSub + avatar if linking for the first time
      const patch: Record<string, unknown> = { lastLoginAt: new Date(), updatedAt: new Date() };
      if (!existing.googleSub) patch['googleSub'] = googleSub;
      if (!existing.avatarUrl && avatarUrl) patch['avatarUrl'] = avatarUrl;
      if (!existing.firstName && firstName) patch['firstName'] = firstName;
      if (!existing.lastName  && lastName)  patch['lastName']  = lastName;

      const [updated] = await this.db.db
        .update(users)
        .set(patch as any)
        .where(eq(users.id, existing.id))
        .returning();
      user = updated!;
    } else {
      // Auto-create as 'public' role
      const [created] = await this.db.db
        .insert(users)
        .values({
          email,
          googleSub,
          firstName,
          lastName,
          avatarUrl,
          role: 'public',
          isActive: true,
          lastLoginAt: new Date(),
        })
        .returning();
      if (!created) throw new Error('Failed to create user.');
      user = created;
    }

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId ?? null,
      tenantId: user.tenantId ?? null,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(jwtPayload, {
        secret: this.config.get('jwt.secret'),
        expiresIn: this.config.get('jwt.expiresIn'),
      }),
      this.jwt.signAsync(jwtPayload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken, user: jwtPayload };
  }

  async validateUser(email: string, password: string) {
    const [user] = await this.db.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    if (!user.passwordHash) {
      throw new UnauthorizedException('This account uses Google sign-in. Continue with Google instead.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId ?? null,
      tenantId: user.tenantId ?? null,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('jwt.secret'),
        expiresIn: this.config.get('jwt.expiresIn'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken, user: payload };
  }

  async register(data: { email: string; password: string; firstName?: string; lastName?: string }) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const [user] = await this.db.db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'public',
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        orgId: users.orgId,
        tenantId: users.tenantId,
      });

    if (!user) throw new Error('Failed to create user');
    return user;
  }

  async requestPasswordReset(email: string, origin: string | null) {
    // Always look up by lowercase email. Never reveal whether the account exists.
    const [user] = await this.db.db
      .select({ id: users.id, email: users.email, isActive: users.isActive })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // In production, an existing-account hit would dispatch a real email. For
    // the pilot we generate a token and return its URL to the caller so the
    // simulated reset link can be displayed on screen.
    const isDev = (this.config.get<string>('node.env') ?? process.env['NODE_ENV']) !== 'production';
    let resetUrl: string | null = null;

    if (user && user.isActive) {
      const token = await this.jwt.signAsync(
        { sub: user.id, email: user.email, purpose: 'reset' },
        {
          secret: this.config.get('jwt.refreshSecret'),
          expiresIn: '15m',
        },
      );
      const base = origin ?? 'http://localhost:3000';
      resetUrl = `${base.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
    }

    return {
      ok: true,
      // In dev we surface the URL so the simulation works without SMTP.
      // In production this should always be null and the URL goes by email.
      devResetUrl: isDev ? resetUrl : null,
    };
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    let payload: { sub: string; purpose?: string };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('This reset link has expired. Request a new one.');
    }
    if (payload.purpose !== 'reset') {
      throw new UnauthorizedException('Invalid reset token.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const [updated] = await this.db.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, payload.sub))
      .returning({ id: users.id, email: users.email });
    if (!updated) throw new UnauthorizedException('Account not found.');
    return { ok: true, email: updated.email };
  }

  async refreshToken(token: string) {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('jwt.refreshSecret'),
      });

      const newPayload: JwtPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        orgId: payload.orgId,
        tenantId: payload.tenantId,
      };

      return {
        accessToken: await this.jwt.signAsync(newPayload, {
          secret: this.config.get('jwt.secret'),
          expiresIn: this.config.get('jwt.expiresIn'),
        }),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const [user] = await this.db.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        orgId: users.orgId,
        tenantId: users.tenantId,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new UnauthorizedException('User not found');
    return {
      ...user,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, data: { firstName?: string | null; lastName?: string | null }) {
    const [updated] = await this.db.db
      .update(users)
      .set({
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      });
    if (!updated) throw new UnauthorizedException('User not found');
    return updated;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const [user] = await this.db.db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.passwordHash) {
      throw new UnauthorizedException('This account uses Google sign-in only. Set a password from your provider instead.');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.db.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return { ok: true };
  }
}
