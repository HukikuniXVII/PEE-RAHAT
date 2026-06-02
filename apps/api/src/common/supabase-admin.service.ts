import { Injectable, Logger } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Thin server-side wrapper around the Supabase GoTrue API for the few
 * places apps/api needs to act on the auth user directly rather than just
 * validate a JWT (NFR-04 account deletion: password re-auth + the emailed
 * confirmation link).
 *
 * Mirrors StorageService's "real-when-configured, stub-in-dev" philosophy:
 *  - verifyPassword needs the anon (or service-role) key + SUPABASE_URL.
 *  - sendAccountDeletionEmail needs the SERVICE_ROLE key (admin API).
 * When the relevant key is unset the methods degrade gracefully so local
 * dev / tests can still drive the flow without a live Supabase project.
 */
@Injectable()
export class SupabaseAdminService {
  private readonly logger = new Logger(SupabaseAdminService.name);

  private get url(): string | undefined {
    return process.env.SUPABASE_URL;
  }

  /** Service-role key — required for the admin (generateLink) surface. */
  private get serviceRoleKey(): string | undefined {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  /** Key used to call the public token endpoint (signInWithPassword). The
   *  anon key is the correct one; fall back to the service-role key, which
   *  the gateway also accepts as a valid `apikey`. */
  private get passwordVerifyKey(): string | undefined {
    return process.env.SUPABASE_ANON_KEY ?? this.serviceRoleKey;
  }

  private get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  }

  private adminClient(): SupabaseClient | null {
    if (!this.url || !this.serviceRoleKey) return null;
    return createClient(this.url, this.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /**
   * Re-authenticate a destructive action by checking the user's current
   * password against Supabase. Returns true on a valid password.
   *
   * When Supabase isn't configured: in production this throws (we never
   * skip a security check on prod); in dev it logs a warning and passes so
   * the flow stays testable against the storage-stub-style local setup.
   */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    if (!this.url || !this.passwordVerifyKey) {
      if (this.isProduction) {
        throw new Error(
          "Supabase is not configured (SUPABASE_URL / key unset) — cannot verify password",
        );
      }
      this.logger.warn(
        "Supabase not configured — skipping password re-auth (dev only)",
      );
      return true;
    }
    const client = createClient(this.url, this.passwordVerifyKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      // Wrong password, unconfirmed email, etc. — all "not verified".
      this.logger.debug(`Password verification failed: ${error.message}`);
      return false;
    }
    // Best-effort: drop the session we just minted; the transient client is
    // discarded anyway, but this avoids leaving a refresh token live.
    await client.auth.signOut().catch(() => undefined);
    return true;
  }

  /**
   * Deliver the account-deletion confirmation link. Uses the Supabase admin
   * generateLink surface (magiclink type) with redirectTo pointing at our
   * web confirm page, which carries our own 1h deletion JWT as a query
   * param — Supabase sends the email when the project's SMTP is configured.
   *
   * Returns { sent: false } when the admin API isn't available (service-role
   * key unset). The caller then surfaces the link via devConfirmUrl so the
   * flow can be completed locally.
   */
  async sendAccountDeletionEmail(
    email: string,
    confirmUrl: string,
  ): Promise<{ sent: boolean }> {
    const client = this.adminClient();
    if (!client) {
      this.logger.warn(
        `Supabase admin not configured — account-deletion link for ${email} not emailed; surfacing devConfirmUrl instead`,
      );
      return { sent: false };
    }
    try {
      const { error } = await client.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: confirmUrl },
      });
      if (error) {
        this.logger.error(
          `generateLink failed for ${email}: ${error.message}`,
        );
        return { sent: false };
      }
      return { sent: true };
    } catch (err) {
      this.logger.error(
        `generateLink threw for ${email}: ${(err as Error).message}`,
      );
      return { sent: false };
    }
  }
}
