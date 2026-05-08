import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import type { QuizSubmissionDto, Subject } from "@peerahat/types";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { QuizService } from "./quiz.service";

@Controller("quiz")
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  @Get("questions")
  questions(@Query("subject") subject: Subject) {
    return this.quiz.questions(subject);
  }

  @Post("submit")
  @UseGuards(SupabaseAuthGuard)
  submit(@CurrentUser() user: SupabaseJwtPayload, @Body() dto: QuizSubmissionDto) {
    return this.quiz.submit(user.sub, dto);
  }
}
