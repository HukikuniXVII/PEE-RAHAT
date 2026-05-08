import { AuthGuard } from "@nestjs/passport";

export class SupabaseAuthGuard extends AuthGuard("supabase") {}
