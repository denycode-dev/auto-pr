import type * as React from "react";

import { cn } from "cn";

interface DashboardEmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function DashboardEmptyState({ icon: Icon, title, description, action, className }: DashboardEmptyStateProps) {
  return (
    <div className={cn("space-y-3 p-8 text-center sm:p-12", className)}>
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="mx-auto max-w-sm text-muted-foreground text-xs leading-relaxed">{description}</p>
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
