import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import jwksClient from "jwks-rsa";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface SupabaseJwtPayload {
  sub: string;
  email: string;
  role?: string;
  user_metadata?: Record<string, unknown>;
}

type SecretOrKeyDone = (err: Error | null, secret?: string | Buffer) => void;

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, "supabase") {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL must be set");
    }
    const hmacSecret = process.env.SUPABASE_JWT_SECRET;

    const jwks = jwksClient({
      jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 10 * 60 * 1000,
      rateLimit: true,
      jwksRequestsPerMinute: 30,
    });

    const secretOrKeyProvider = (
      _req: unknown,
      rawJwt: string,
      done: SecretOrKeyDone,
    ): void => {
      try {
        const headerSegment = rawJwt.split(".")[0];
        if (!headerSegment) {
          return done(new Error("Malformed JWT: missing header segment"));
        }
        const header = JSON.parse(
          Buffer.from(headerSegment, "base64url").toString("utf8"),
        ) as { alg?: string; kid?: string };

        if (header.alg === "HS256") {
          if (!hmacSecret) {
            return done(
              new Error("HS256 token received but SUPABASE_JWT_SECRET is unset"),
            );
          }
          return done(null, hmacSecret);
        }

        if (!header.kid) {
          return done(new Error("Asymmetric token missing kid header"));
        }
        jwks.getSigningKey(header.kid, (err, key) => {
          if (err || !key) {
            return done(err ?? new Error("Signing key not found in JWKS"));
          }
          done(null, key.getPublicKey());
        });
      } catch (e) {
        done(e instanceof Error ? e : new Error(String(e)));
      }
    };

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider,
      algorithms: ["HS256", "ES256", "RS256"],
    });
  }

  validate(payload: SupabaseJwtPayload): SupabaseJwtPayload {
    if (!payload?.sub) throw new UnauthorizedException();
    return payload;
  }
}
