import { redirect } from "next/navigation";

interface Props {
  params: { threadId: string };
}

// Legacy URL — chat deep-links now route through /chat?thread=<id> so
// every conversation lives at one canonical URL. Kept here so older
// bookmarks and booking-row links still land in the right place.
export default function ChatThreadRedirect({ params }: Props) {
  redirect(`/chat?thread=${encodeURIComponent(params.threadId)}`);
}
