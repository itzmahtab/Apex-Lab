import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="text-center py-10" role="status">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="mt-2 text-sm text-muted max-w-prose mx-auto">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}

export function ErrorState({ title = "Something went wrong", message, action }: { title?: string; message: string; action?: ReactNode }) {
  return (
    <Card className="border-accent/50" role="alert">
      <h3 className="text-lg font-semibold text-accent">{title}</h3>
      <p className="mt-2 text-sm text-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export const SkeletonCard = ({ h = "h-64" }: { h?: string }) => <div className={`skeleton w-full ${h}`} aria-hidden="true" />;

export function DataStatusNotice({ isDemo, sourceName, warnings }: { isDemo: boolean; sourceName: string; warnings: string[] }) {
  return (
    <div className="space-y-2">
      {isDemo && (
        <p className="rounded-lg border border-warn/50 bg-warn/10 px-3 py-2 text-sm text-warn" role="note">
          <strong>Demo data.</strong> Every value on this page is synthetic and invented (source: {sourceName}). It is not a real F1 result.
        </p>
      )}
      {warnings.length > 0 && (
        <ul className="rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-muted list-disc pl-6" aria-label="Data notices">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}
