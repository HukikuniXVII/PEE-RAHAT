import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { IsString } from "class-validator";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { ChatService } from "./chat.service";

class SendMessageDto {
  @IsString() body!: string;
}

@Controller("chat")
@UseGuards(SupabaseAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get("threads")
  threads(@CurrentUser() user: SupabaseJwtPayload) {
    return this.chat.threadsForUser(user.sub);
  }

  @Post("threads/with/:tutorId")
  openWithTutor(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("tutorId") tutorId: string,
  ) {
    return this.chat.openWithTutor(user.sub, tutorId);
  }

  @Get("threads/:threadId/messages")
  messages(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("threadId") threadId: string,
  ) {
    return this.chat.messages(user.sub, threadId);
  }

  @Post("threads/:threadId/messages")
  send(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("threadId") threadId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.send(user.sub, threadId, dto.body);
  }
}
