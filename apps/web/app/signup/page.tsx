import { AuthCard, PageBackground } from "@peerahat/ui";
import Image from "next/image";
import { redirect } from "next/navigation";

import { sanitizeNextPath } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/supabase/server";

import { SignupForm } from "./_components/signup-form";

interface Props {
  searchParams: { next?: string };
}

export default async function SignupPage({ searchParams }: Props) {
  const token = await getServerAccessToken();
  if (token) {
    redirect(sanitizeNextPath(searchParams.next));
  }

  return (
    <>
      <PageBackground />
      <div className="flex h-screen items-center justify-center overflow-hidden">
        <AuthCard
          mascot={
            <Image
              src="/mascot.png"
              alt="Pee Rahat mascot"
              width={880}
              height={880}
              priority
              className="h-full w-full object-contain object-bottom"
            />
          }
        >
          <SignupForm />
        </AuthCard>
      </div>
    </>
  );
}
