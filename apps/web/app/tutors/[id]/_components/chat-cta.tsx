"use client";

import type { Tutor } from "@peerahat/types";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { createApiClient } from "@/lib/api-client";

interface Props {
  tutor: Tutor;
}

export function ChatCta({ tutor }: Props) {
  const meQuery = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => createApiClient().users.me(),
    staleTime: 60_000,
    retry: false,
  });
  if (meQuery.data?.tutorProfileId === tutor.id) return null;

  const chatHref = `/chat/${tutor.id}` as Route;
  return (
    <Link
      href={chatHref}
      className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
    >
      <MessageSquare size={16} />
      แชทกับพี่{tutor.displayName.split(" ")[0]}
    </Link>
  );
}
