import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import {
  AccountDeletionController,
  UsersController,
} from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  // Secret + expiry are passed per-call (sign/verify options) so the
  // account-deletion JWT uses its own ACCOUNT_DELETION_JWT_SECRET, separate
  // from the Supabase JWTs the auth guard validates.
  imports: [JwtModule.register({})],
  controllers: [UsersController, AccountDeletionController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
