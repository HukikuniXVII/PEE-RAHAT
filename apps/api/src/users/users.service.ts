import { BadRequestException, Injectable } from "@nestjs/common";
import type { UserProfileUpdateDto } from "@peerahat/types";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findOrCreateBySupabase(params: {
    supabaseId: string;
    email: string;
    displayName: string;
  }) {
    return this.prisma.user.upsert({
      where: { supabaseId: params.supabaseId },
      update: { email: params.email },
      create: {
        supabaseId: params.supabaseId,
        email: params.email,
        displayName: params.displayName,
      },
      include: { tutorProfile: { select: { id: true } } },
    });
  }

  findBySupabaseId(supabaseId: string) {
    return this.prisma.user.findUnique({ where: { supabaseId } });
  }

  async updateProfile(supabaseId: string, dto: UserProfileUpdateDto) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException("Unknown user");
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
      include: { tutorProfile: { select: { id: true } } },
    });
  }
}
