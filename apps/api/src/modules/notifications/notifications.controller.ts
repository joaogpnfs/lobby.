import { Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { NotificationList } from "@lobby/types";
import { NotificationsService } from "./notifications.service.js";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "The caller's latest notifications and how many are unread." })
  list(): Promise<NotificationList> {
    return this.notifications.list();
  }

  @Post("read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Marks all of the caller's notifications as read." })
  readAll(): Promise<null> {
    return this.notifications.readAll();
  }
}
