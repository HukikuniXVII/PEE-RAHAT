import { notFound } from "next/navigation";

import { DesignPreview } from "./_components/design-preview";

export const metadata = {
  title: "UI Preview (admin)",
};

// UI design preview surface. Picks any route from a dropdown and
// renders it in an iframe so we can iterate on design without
// navigating + meeting each page's data preconditions.
//
// Visibility:
//   - lives under /admin/* → inherits the existing requireAdmin gate
//   - gated by NODE_ENV → returns 404 in production builds, so this
//     never ships to real users
export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignPreview />;
}
