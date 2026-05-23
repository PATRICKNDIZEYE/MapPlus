import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthRouter } from './auth.router';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets injected dynamically in AuthService
  ],
  providers: [AuthService, AuthRouter],
  exports: [AuthService, AuthRouter],
})
export class AuthModule {}
