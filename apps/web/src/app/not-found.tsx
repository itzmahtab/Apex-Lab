import { PageContainer } from "@/components/site";
import { EmptyState } from "@/components/states";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return <PageContainer><EmptyState title="Page not found" action={<LinkButton href="/">Back home</LinkButton>}>That page doesn&apos;t exist.</EmptyState></PageContainer>;
}
