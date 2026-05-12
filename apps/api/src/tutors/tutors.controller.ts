import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import type {
  Subject,
  Tutor,
  TutorReview,
  TutorSearchResult,
} from "@peerahat/types";

const SUBJECT_VALUES = [
  "Math",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Social",
  "Thai",
] as const satisfies readonly Subject[];

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { TutorsService } from "./tutors.service";

class CreateReviewDto {
  @IsString() bookingId!: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsString() text!: string;
}

class TutorOnboardingDto {
  @IsString() @MinLength(20) @MaxLength(2000) bio!: string;
  @IsString() @MinLength(1) @MaxLength(120) university!: string;
  @IsString() @MinLength(1) @MaxLength(120) faculty!: string;
  @IsInt() @Min(0) @Max(20000) hourlyRate!: number;
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(SUBJECT_VALUES, { each: true })
  subjects!: Subject[];
  @IsOptional() @IsUrl() introVideoUrl?: string;
}

@Controller("tutors")
export class TutorsController {
  constructor(private readonly tutors: TutorsService) {}

  @Get()
  search(
    @Query("q") q?: string,
    @Query("subject") subject?: Subject,
    @Query("university") university?: string,
    @Query("minRating") minRating?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("sort") sort?: "rating" | "priceAsc" | "priceDesc" | "newest",
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<TutorSearchResult> {
    return this.tutors.search({
      q,
      subject,
      university,
      minRating: minRating ? Number(minRating) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Post("onboarding")
  @UseGuards(SupabaseAuthGuard)
  onboard(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() dto: TutorOnboardingDto,
  ): Promise<Tutor> {
    return this.tutors.onboard(user.sub, dto);
  }

  @Get(":id")
  findOne(@Param("id") id: string): Promise<Tutor> {
    return this.tutors.findById(id);
  }

  @Get(":id/reviews")
  reviews(
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<{
    items: TutorReview[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.tutors.listReviews(
      id,
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
    );
  }

  @Post(":id/reviews")
  @UseGuards(SupabaseAuthGuard)
  createReview(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") tutorId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<TutorReview> {
    return this.tutors.createReview(user.sub, tutorId, dto);
  }
}
