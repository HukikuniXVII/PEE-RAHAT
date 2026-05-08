import { Injectable } from "@nestjs/common";

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
    });
  }

  findBySupabaseId(supabaseId: string) {
    return this.prisma.user.findUnique({ where: { supabaseId } });
  }
}
