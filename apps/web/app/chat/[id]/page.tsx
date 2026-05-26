import { redirect } from "next/navigation";

interface Props {
  params: { id: string };
}

// Legacy URL — chat entry points now route through /chat?with=<tutorId>
// so every conversation lives at one canonical URL. Kept here so old
// bookmarks and in-flight links still land in the right place.
export default function ChatWithTutorRedirect({ params }: Props) {
  redirect(`/chat?with=${encodeURIComponent(params.id)}`);
}
