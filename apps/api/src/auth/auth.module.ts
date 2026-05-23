import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthRouter } from './auth.router';

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets injected dynamically in AuthService
  ],
  providers: [AuthService, AuthRouter],
  exports: [AuthService, AuthRouter, JwtModule],
})
export class AuthModule {}
