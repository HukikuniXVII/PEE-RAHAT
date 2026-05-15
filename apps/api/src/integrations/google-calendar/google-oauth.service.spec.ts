import crypto from "node:crypto";

import { BadRequestException, NotFoundException } from "@nestjs/common";

import { CryptoService } from "../../common/crypto.service";
import { GoogleOAuthService } from "./google-oauth.service";

const generateAuthUrl = jest.fn();
const getToken = jest.fn();
const userinfoGet = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: (args: unknown) => generateAuthUrl(args),
        getToken: (code: unknown) => getToken(code),
        setCredentials: jest.fn(),
      })),
    },
    oauth2: jest.fn(() => ({
      userinfo: { get: () => userinfoGet() },
    })),
  },
}));

function setupEnv() {
  process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_OAUTH_REDIRECT_URI = "http://localhost:3001/api/auth/google/callback";
  process.env.GOOGLE_OAUTH_STATE_JWT_SECRET = "test-state-secret";
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
}

function makeService(
  tutor: Record<string, unknown> | null = { id: "tut_1" },
) {
  const prisma = {
    tutorProfile: {
      findUnique: jest.fn(async (..._args: unknown[]) => tutor),
      update: jest.fn(async (..._args: unknown[]) => tutor),
    },
  };
  const cryptoSvc = new CryptoService();
  const svc = new GoogleOAuthService(prisma as never, cryptoSvc);
  return { svc, prisma, cryptoSvc };
}

describe("GoogleOAuthService (FR-TH-17 rev3)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    setupEnv();
    generateAuthUrl.mockReset();
    getToken.mockReset();
    userinfoGet.mockReset();
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getAuthorizationUrl", () => {
    it("requests offline access + consent prompt + calendar.events scope", () => {
      generateAuthUrl.mockReturnValueOnce("https://accounts.google.com/o/oauth2/v2/auth?...");
      const { svc } = makeService();
      const url = svc.getAuthorizationUrl("tut_1");
      expect(url).toMatch(/accounts\.google\.com/);
      expect(generateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: "offline",
          prompt: "consent",
          scope: ["https://www.googleapis.com/auth/calendar.events"],
        }),
      );
      // The state JWT carries the tutorId — we don't pin the exact value
      // (it's signed at runtime) but it must be present.
      expect(generateAuthUrl.mock.calls[0]![0]).toHaveProperty("state");
    });
  });

  describe("handleCallback", () => {
    it("verifies state, exchanges code, encrypts refresh_token, persists", async () => {
      generateAuthUrl.mockReturnValueOnce("https://stub");
      getToken.mockResolvedValueOnce({
        tokens: { refresh_token: "1//real-refresh", access_token: "ya29.x" },
      });
      userinfoGet.mockResolvedValueOnce({ data: { email: "nut@gmail.com" } });
      const { svc, prisma, cryptoSvc } = makeService();
      // Mint a real state JWT via the same path the production flow uses,
      // then pluck it from generateAuthUrl's recorded args.
      svc.getAuthorizationUrl("tut_1");
      const generateAuthUrlArgs = generateAuthUrl.mock.calls[0]?.[0] as
        | { state: string }
        | undefined;
      const state = generateAuthUrlArgs?.state ?? "";
      expect(state).toBeTruthy();

      const result = await svc.handleCallback("auth_code_abc", state);

      expect(result).toEqual({ tutorId: "tut_1", email: "nut@gmail.com" });
      expect(prisma.tutorProfile.update).toHaveBeenCalledWith({
        where: { id: "tut_1" },
        data: expect.objectContaining({
          googleEmail: "nut@gmail.com",
          googleConnectedAt: expect.any(Date),
        }),
      });
      // refresh_token must be encrypted on the wire, not plaintext.
      const updateArgs = prisma.tutorProfile.update.mock.calls[0]?.[0] as
        | { data: { googleRefreshToken: string } }
        | undefined;
      const persisted = updateArgs?.data.googleRefreshToken ?? "";
      expect(persisted).not.toBe("1//real-refresh");
      expect(cryptoSvc.decrypt(persisted)).toBe("1//real-refresh");
    });

    it("rejects an invalid state JWT", async () => {
      const { svc } = makeService();
      await expect(
        svc.handleCallback("code", "not-a-jwt"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects when Google returns no refresh_token", async () => {
      generateAuthUrl.mockReturnValueOnce("https://stub");
      getToken.mockResolvedValueOnce({ tokens: { access_token: "ya29.x" } });
      const { svc } = makeService();
      svc.getAuthorizationUrl("tut_1");
      const state = (generateAuthUrl.mock.calls[0]?.[0] as { state: string }).state;
      await expect(
        svc.handleCallback("code", state),
      ).rejects.toThrow(/no refresh_token/);
    });

    it("rejects when userinfo response missing email", async () => {
      generateAuthUrl.mockReturnValueOnce("https://stub");
      getToken.mockResolvedValueOnce({ tokens: { refresh_token: "1//x" } });
      userinfoGet.mockResolvedValueOnce({ data: {} });
      const { svc } = makeService();
      svc.getAuthorizationUrl("tut_1");
      const state = (generateAuthUrl.mock.calls[0]?.[0] as { state: string }).state;
      await expect(svc.handleCallback("code", state)).rejects.toThrow(/missing email/);
    });
  });

  describe("getAuthorizedClient", () => {
    it("returns OAuth2Client with decrypted refresh_token", async () => {
      const cryptoSvc = new CryptoService();
      const encrypted = cryptoSvc.encrypt("1//stored-refresh");
      const { svc } = makeService({ id: "tut_1", googleRefreshToken: encrypted });

      const client = await svc.getAuthorizedClient("tut_1");

      expect(client).toBeDefined();
      // setCredentials was called with the decrypted token.
      const setCreds = (client as unknown as { setCredentials: jest.Mock }).setCredentials;
      expect(setCreds).toHaveBeenCalledWith({ refresh_token: "1//stored-refresh" });
    });

    it("throws NotFoundException when tutor missing", async () => {
      const { svc } = makeService(null);
      await expect(svc.getAuthorizedClient("missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("throws BadRequestException when tutor hasn't connected Google", async () => {
      const { svc } = makeService({ id: "tut_1", googleRefreshToken: null });
      await expect(svc.getAuthorizedClient("tut_1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe("status + disconnect", () => {
    it("status returns connected=false when no refresh_token", async () => {
      const { svc, prisma } = makeService();
      prisma.tutorProfile.findUnique.mockResolvedValueOnce({
        googleEmail: null,
        googleConnectedAt: null,
        googleRefreshToken: null,
      });
      expect(await svc.status("tut_1")).toEqual({ connected: false });
    });

    it("status returns email + connectedAt when connected", async () => {
      const { svc, prisma } = makeService();
      const at = new Date();
      prisma.tutorProfile.findUnique.mockResolvedValueOnce({
        googleEmail: "nut@gmail.com",
        googleConnectedAt: at,
        googleRefreshToken: "encrypted-blob",
      });
      expect(await svc.status("tut_1")).toEqual({
        connected: true,
        email: "nut@gmail.com",
        connectedAt: at.toISOString(),
      });
    });

    it("disconnect nulls all google* fields", async () => {
      const { svc, prisma } = makeService();
      await svc.disconnect("tut_1");
      expect(prisma.tutorProfile.update).toHaveBeenCalledWith({
        where: { id: "tut_1" },
        data: {
          googleRefreshToken: null,
          googleEmail: null,
          googleConnectedAt: null,
        },
      });
    });
  });
});
