import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  type CreateReviewDto,
  type CreateUnavailabilityDto,
  createReviewSchema,
  createUnavailabilitySchema,
  type MaskedBankInfo,
  type Subject,
  type Tutor,
  type TutorOnboardingDto,
  type TutorProfileUpdateDto,
  type TutorReview,
  type TutorSearchResult,
  tutorOnboardingSchema,
  tutorProfileUpdateSchema,
  type UpdateBankDto,
  updateBankSchema,
} from "@peerahat/types";

import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/auth.guard";
import type { SupabaseJwtPayload } from "../auth/supabase-jwt.strategy";
import { parseAvailabilityWindow } from "../common/availability-window";
import { TutorsService } from "./tutors.service";

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

  // FR-TH-03: tutor profile onboarding. Validation comes from
  // @peerahat/types' tutorOnboardingSchema (same schema the web form uses)
  // so there's one source of truth for the field rules. AllExceptionsFilter
  // turns a ZodError into 400 + VALIDATION_ERROR + details.issues.
  @Post("onboarding")
  @UseGuards(SupabaseAuthGuard)
  onboard(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ): Promise<Tutor> {
    const dto: TutorOnboardingDto = tutorOnboardingSchema.parse(raw);
    return this.tutors.onboard(user.sub, dto);
  }

  // FR-TH-03: same field rules as onboarding but every field is optional
  // (tutorProfileUpdateSchema = tutorOnboardingSchema.partial()).
  @Patch("me")
  @UseGuards(SupabaseAuthGuard)
  updateMe(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ): Promise<Tutor> {
    const dto: TutorProfileUpdateDto = tutorProfileUpdateSchema.parse(raw);
    return this.tutors.updateMyProfile(user.sub, dto);
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

  @Get(":id/availability")
  async availability(
    @Param("id") id: string,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    const { fromDate, toDate } = parseAvailabilityWindow(from, to);
    const busy = await this.tutors.listBusyForTutor(id, fromDate, toDate);
    return { busy };
  }

  // FR-TH-16: tutor-managed recurring weekly unavailability.
  @Get("me/unavailability")
  @UseGuards(SupabaseAuthGuard)
  listMyUnavailability(@CurrentUser() user: SupabaseJwtPayload) {
    return this.tutors.listMyUnavailability(user.sub);
  }

  @Post("me/unavailability")
  @UseGuards(SupabaseAuthGuard)
  createMyUnavailability(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ) {
    const dto: CreateUnavailabilityDto = createUnavailabilitySchema.parse(raw);
    return this.tutors.createUnavailability(user.sub, dto);
  }

  @Delete("me/unavailability/:id")
  @UseGuards(SupabaseAuthGuard)
  deleteMyUnavailability(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") id: string,
  ) {
    return this.tutors.deleteUnavailability(user.sub, id);
  }

  // FR-TH-02: bank-info read + edit for tutors after KYC approval.
  @Get("me/bank")
  @UseGuards(SupabaseAuthGuard)
  getMyBank(
    @CurrentUser() user: SupabaseJwtPayload,
  ): Promise<MaskedBankInfo | null> {
    return this.tutors.getMyBank(user.sub);
  }

  // FR-TH-02: validation lives in @peerahat/types' updateBankSchema (the
  // same schema the web bank-edit form uses) so there's one source of truth
  // for the bank-info shape. AllExceptionsFilter turns a ZodError from
  // malformed input into a 400 + VALIDATION_ERROR + details.issues, matching
  // the envelope explicit safeParse callsites emit.
  @Patch("me/bank")
  @UseGuards(SupabaseAuthGuard)
  updateMyBank(
    @CurrentUser() user: SupabaseJwtPayload,
    @Body() raw: unknown,
  ): Promise<MaskedBankInfo> {
    const dto: UpdateBankDto = updateBankSchema.parse(raw);
    return this.tutors.updateMyBank(user.sub, dto);
  }

  @Post(":id/reviews")
  @UseGuards(SupabaseAuthGuard)
  createReview(
    @CurrentUser() user: SupabaseJwtPayload,
    @Param("id") tutorId: string,
    @Body() raw: unknown,
  ): Promise<TutorReview> {
    const dto: CreateReviewDto = createReviewSchema.parse(raw);
    return this.tutors.createReview(user.sub, tutorId, dto);
  }
}
