import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { google, type Auth } from "googleapis";
import jwt from "jsonwebtoken";

import { CryptoService } from "../../common/crypto.service";
import { PrismaService } from "../../prisma/prisma.service";

const STATE_TTL = "10m";
// calendar.events is the only scope the runtime *uses*, but userinfo.email
// (+ openid) is required so the callback can read the tutor's Google email
// to persist alongside the refresh token. Without these the userinfo.get()
// call in handleCallback throws "missing required authentication credential".
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

interface StatePayload {
  tutorId: string;
}

/**
 * FR-TH-17 rev3: per-tutor Google OAuth.
 *
 * Three responsibilities:
 *
 *  1. getAuthorizationUrl(tutorId): build the redirect URL the tutor's
 *     browser hits to start the consent flow. `access_type: 'offline'` +
 *     `prompt: 'consent'` are both required — without consent prompt,
 *     Google returns no refresh_token on re-authorizations, which would
 *     silently break the reconnect path.
 *
 *  2. handleCallback(code, state): finishes the dance. Verifies the
 *     state JWT (which carries the tutorId so we know whose account
 *     this is for), exchanges the auth code for tokens, fetches the
 *     Google user's email (so the UI can show "Connected as foo@gmail"),
 *     encrypts the refresh_token, and persists everything on the
 *     TutorProfile.
 *
 *  3. getAuthorizedClient(tutorId): the workhorse other services call.
 *     Loads the tutor's encrypted refresh_token, decrypts, and returns
 *     a configured OAuth2Client. google-auth-library handles access-
 *     token refresh transparently from here.
 */
@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  getAuthorizationUrl(tutorId: string): string {
    const state = jwt.sign({ tutorId } satisfies StatePayload, this.stateSecret(), {
      expiresIn: STATE_TTL,
    });
    const client = this.buildClient();
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      state,
      include_granted_scopes: true,
    });
  }

  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ tutorId: string; email: string }> {
    let payload: StatePayload;
    try {
      payload = jwt.verify(state, this.stateSecret()) as StatePayload;
    } catch (err) {
      throw new BadRequestException(
        `OAuth state invalid or expired: ${(err as Error).message}`,
      );
    }
    if (!payload.tutorId) {
      throw new BadRequestException("OAuth state missing tutorId");
    }

    const client = this.buildClient();
    let tokens: Auth.Credentials;
    try {
      ({ tokens } = await client.getToken(code));
    } catch (err) {
      throw new BadRequestException(
        `Token exchange failed: ${(err as Error).message}`,
      );
    }
    if (!tokens.refresh_token) {
      // The most common cause is the user had already granted the scope
      // and Google skipped re-issuing a refresh_token because prompt was
      // not 'consent'. We always force prompt=consent, so a missing
      // refresh_token here means something else is wrong.
      throw new BadRequestException(
        "Google returned no refresh_token — ensure prompt=consent and that the OAuth client is configured for offline access",
      );
    }

    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: userInfo } = await oauth2.userinfo.get();
    const email = userInfo.email;
    if (!email) {
      throw new BadRequestException(
        "Google userinfo response missing email — cannot persist tutor connection",
      );
    }

    const encrypted = this.crypto.encrypt(tokens.refresh_token);
    await this.prisma.tutorProfile.update({
      where: { id: payload.tutorId },
      data: {
        googleRefreshToken: encrypted,
        googleEmail: email,
        googleConnectedAt: new Date(),
      },
    });
    this.logger.log(`Tutor ${payload.tutorId} connected Google account ${email}`);
    return { tutorId: payload.tutorId, email };
  }

  async getAuthorizedClient(tutorId: string): Promise<Auth.OAuth2Client> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: { googleRefreshToken: true },
    });
    if (!tutor) throw new NotFoundException("Tutor not found");
    if (!tutor.googleRefreshToken) {
      throw new BadRequestException(
        "Tutor has not connected a Google account — cannot mint Meet links until they finish /auth/google/connect",
      );
    }
    const refreshToken = this.crypto.decrypt(tutor.googleRefreshToken);
    const client = this.buildClient();
    client.setCredentials({ refresh_token: refreshToken });
    return client;
  }

  async disconnect(tutorId: string): Promise<void> {
    await this.prisma.tutorProfile.update({
      where: { id: tutorId },
      data: {
        googleRefreshToken: null,
        googleEmail: null,
        googleConnectedAt: null,
      },
    });
  }

  async status(
    tutorId: string,
  ): Promise<{ connected: boolean; email?: string; connectedAt?: string }> {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: { googleEmail: true, googleConnectedAt: true, googleRefreshToken: true },
    });
    if (!tutor || !tutor.googleRefreshToken) return { connected: false };
    return {
      connected: true,
      email: tutor.googleEmail ?? undefined,
      connectedAt: tutor.googleConnectedAt?.toISOString(),
    };
  }

  private buildClient(): Auth.OAuth2Client {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        "Google OAuth not configured — set GOOGLE_OAUTH_CLIENT_ID / _CLIENT_SECRET / _REDIRECT_URI",
      );
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  private stateSecret(): string {
    const s = process.env.GOOGLE_OAUTH_STATE_JWT_SECRET;
    if (!s) {
      throw new Error("GOOGLE_OAUTH_STATE_JWT_SECRET is not set");
    }
    return s;
  }
}
