import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface SupabaseJwtPayload {
  sub: string;
  email: string;
  role?: string;
  user_metadata?: Record<string, unknown>;
}

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, "supabase") {
  constructor() {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new Error("SUPABASE_JWT_SECRET must be set");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ["HS256"],
    });
  }

  validate(payload: SupabaseJwtPayload): SupabaseJwtPayload {
    if (!payload?.sub) throw new UnauthorizedException();
    return payload;
  }
}
