import type * as React from "react";

import { cn } from "cn";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardSectionCardProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

export function DashboardSectionCard({
  icon: Icon,
  title,
  badge,
  description,
  actions,
  children,
  className,
  contentClassName,
  noPadding = false,
}: DashboardSectionCardProps) {
  return (
    <Card className={cn("overflow-hidden border shadow-xs", className)}>
      <CardHeader className="border-b bg-muted/20 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="size-4 shrink-0 text-primary" />}
              <CardTitle className="font-semibold text-base text-foreground">{title}</CardTitle>
              {badge}
            </div>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>

          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </CardHeader>

      <CardContent className={cn(noPadding ? "p-0" : "p-4 sm:p-6", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
