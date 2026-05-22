import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const prisma = new PrismaClient();

const TEST_USERS = [
  { email: "ning.test@peerahat.local", password: "Test1234!", seedSupabaseId: "seed-ning", role: "student" },
  { email: "nut.test@peerahat.local", password: "Test1234!", seedSupabaseId: "seed-nut", role: "tutor" },
];

async function main() {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const u of TEST_USERS) {
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw listErr;
    let existing = list.users.find((x) => x.email === u.email);
    if (!existing) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error) throw error;
      existing = data.user!;
      console.log(`[supabase] created ${u.email} -> ${existing.id}`);
    } else {
      const { error } = await admin.auth.admin.updateUserById(existing.id, { password: u.password, email_confirm: true });
      if (error) throw error;
      console.log(`[supabase] reused ${u.email} -> ${existing.id}`);
    }

    const row = await prisma.user.update({
      where: { supabaseId: u.seedSupabaseId },
      data: { supabaseId: existing.id, email: u.email },
    });
    console.log(`[prisma] linked User ${row.id} (${u.role}) -> supabaseId=${existing.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
