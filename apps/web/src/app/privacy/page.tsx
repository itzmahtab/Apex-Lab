import type { Metadata } from "next";
import { PageContainer } from "@/components/site";

export const metadata: Metadata = { title: "Privacy" };

export default function Page() {
  return (
    <PageContainer>
      <article className="max-w-3xl space-y-4 text-muted [&_h1]:text-fg [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-fg [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        <h1>Privacy</h1>
        <p>This local build collects no personal data, has no accounts, and sets no tracking cookies. Comparison selections live only in the page URL. Before any public launch this page will be replaced with a full privacy policy.</p>
      </article>
    </PageContainer>
  );
}
