import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { VacationsController } from "./vacations.controller.js";
import { VacationsService } from "./vacations.service.js";

@Module({
  imports: [NotificationsModule],
  controllers: [VacationsController],
  providers: [VacationsService],
  exports: [VacationsService],
})
export class VacationsModule {}
