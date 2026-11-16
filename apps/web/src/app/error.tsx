"use client";
import { PageContainer } from "@/components/site";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <PageContainer><ErrorState message="An unexpected error occurred. Please try again." action={<Button onClick={reset}>Try again</Button>} /></PageContainer>;
}
