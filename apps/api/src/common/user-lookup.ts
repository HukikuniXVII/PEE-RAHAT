import { BadRequestException } from "@nestjs/common";
import type { User } from "@prisma/client";

import type { PrismaService } from "../prisma/prisma.service";

/**
 * Resolve a Supabase JWT subject into the local User row, throwing when
 * no matching row exists. Used by the booking-side endpoints, where the
 * caller is authenticated by Supabase already — a missing User row
 * indicates a sync gap, not an ordinary not-found case.
 *
 * Centralised so every call site surfaces the same Thai message
 * ("ไม่พบผู้ใช้") instead of an empty BadRequestException.
 */
export async function requireUserBySupabaseId(
  prisma: PrismaService,
  supabaseId: string,
): Promise<User> {
  const user = await prisma.user.findUnique({ where: { supabaseId } });
  if (!user) throw new BadRequestException("ไม่พบผู้ใช้");
  return user;
}
