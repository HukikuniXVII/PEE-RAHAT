import { createApiClient } from "@/lib/api-client";
import { getServerAccessToken } from "@/lib/supabase/server";

import { TcasCalculator } from "./_components/tcas-calculator";

export default async function TcasPage() {
  const token = await getServerAccessToken();
  const api = createApiClient({ accessToken: token });
  const [programs, deadlines] = await Promise.all([
    api.tcas.programs(),
    api.tcas.deadlines(),
  ]);

  return (
    <TcasCalculator initialPrograms={programs} initialDeadlines={deadlines} />
  );
}
