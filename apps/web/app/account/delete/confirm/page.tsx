import { PageBackground } from "@peerahat/ui";
import { Suspense } from "react";

import { ConfirmDeletionClient } from "./confirm-client";

// NFR-04 (PDPA): landing target for the emailed account-deletion link.
// The deletion JWT in ?token= is the sole authority (route is public), so
// the click works even without an active session. useSearchParams must sit
// inside a Suspense boundary for the static-render pass.
export default function ConfirmDeletionPage() {
  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <Suspense
          fallback={
            <p className="thai text-sm text-ink-soft">กำลังโหลด...</p>
          }
        >
          <ConfirmDeletionClient />
        </Suspense>
      </div>
    </>
  );
}
