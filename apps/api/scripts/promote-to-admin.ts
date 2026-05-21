// Promote an existing User row to role=admin.
//
// The User row is created on first hit to GET /users/me, so the target
// account must have:
//   1. Signed up via /signup (Supabase auth row exists)
//   2. Logged in at least once OR hit any authenticated endpoint
//      (so the local User row gets materialised)
//
// Run:
//   pnpm --filter @peerahat/api run promote-admin <email>
//
// Example:
//   pnpm --filter @peerahat/api run promote-admin you@example.com

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: tsx scripts/promote-to-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(
      `No User row found for ${email}.\n` +
        `\n` +
        `Steps to fix:\n` +
        `  1. Open the web app and sign up at /signup with that email.\n` +
        `  2. Log in once so the local User row materialises.\n` +
        `  3. Re-run this script.\n`,
    );
    process.exit(2);
  }

  if (user.role === "admin") {
    console.log(`✓ ${email} is already admin (no change).`);
    return;
  }

  const previous = user.role;
  await prisma.user.update({
    where: { email },
    data: { role: "admin" },
  });
  console.log(`✓ Promoted ${email} from "${previous}" → "admin".`);
  console.log(`  User id: ${user.id}`);
  console.log(`  Reload /admin to access the admin tree.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
