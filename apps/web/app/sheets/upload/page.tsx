import { requireAuth } from "@/lib/auth";

import { SheetUploadForm } from "./_components/sheet-upload-form";

export default async function SheetUploadPage() {
  await requireAuth("/sheets/upload");
  return <SheetUploadForm />;
}
