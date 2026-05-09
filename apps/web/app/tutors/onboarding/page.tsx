import { requireAuth } from "@/lib/auth";

import { OnboardingFlow } from "./_components/onboarding-flow";

export default async function TutorOnboardingPage() {
  await requireAuth("/tutors/onboarding");
  return <OnboardingFlow />;
}
