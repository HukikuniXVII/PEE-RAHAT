import { Controller, Get, Param, Query } from "@nestjs/common";
import type {
  Subject,
  Tutor,
  TutorReview,
  TutorSearchResult,
} from "@peerahat/types";

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

  @Get(":id")
  findOne(@Param("id") id: string): Promise<Tutor> {
    return this.tutors.findById(id);
  }

  @Get(":id/reviews")
  reviews(@Param("id") id: string): Promise<{
    items: TutorReview[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.tutors.listReviews(id);
  }
}
