import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { InvitationsController, MembersController } from "./access.controllers.js";
import { AccessService } from "./access.service.js";

@Module({
  imports: [AuthModule],
  controllers: [InvitationsController, MembersController],
  providers: [AccessService],
})
export class AccessModule {}
