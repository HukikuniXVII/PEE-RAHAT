import { redirect } from "next/navigation";

import { getServerAccessToken } from "@/lib/supabase/server";

import { LoginForm } from "./_components/login-form";

interface Props {
  searchParams: { next?: string };
}

export default async function LoginPage({ searchParams }: Props) {
  const token = await getServerAccessToken();
  if (token) {
    redirect(searchParams.next ?? "/");
  }

  return <LoginForm />;
}
