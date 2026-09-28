"use client";

import * as React from "react";

import { cn } from "cn";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DashboardPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  isLoading?: boolean;
  className?: string;
}

export function DashboardPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemName = "data",
  isLoading = false,
  className,
}: DashboardPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = React.useCallback(() => {
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, "ellipsis-right", safeTotalPages] as const;
    }

    if (safeCurrentPage >= safeTotalPages - 3) {
      return [
        1,
        "ellipsis-left",
        safeTotalPages - 4,
        safeTotalPages - 3,
        safeTotalPages - 2,
        safeTotalPages - 1,
        safeTotalPages,
      ] as const;
    }

    return [
      1,
      "ellipsis-left",
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      "ellipsis-right",
      safeTotalPages,
    ] as const;
  }, [safeCurrentPage, safeTotalPages]);

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 border-t bg-card/50 px-4 py-3 sm:flex-row sm:gap-4",
        className,
      )}
    >
      {/* Left side: Information and Page Size Selector */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-muted-foreground text-xs sm:justify-start">
        <div className="flex items-center gap-1.5 font-medium">
          {isLoading && <Loader2 className="size-3 animate-spin text-primary" />}
          <span>
            Menampilkan <strong className="font-semibold text-foreground">{startItem}</strong> -{" "}
            <strong className="font-semibold text-foreground">{endItem}</strong> dari{" "}
            <strong className="font-semibold text-foreground">{totalItems}</strong> {itemName}
          </span>
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-border/60 border-l pl-3">
            <span className="hidden text-muted-foreground text-xs sm:inline">Per halaman:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                onPageSizeChange(Number(val));
                onPageChange(1);
              }}
              disabled={isLoading}
            >
              <SelectTrigger className="h-7 w-[68px] font-mono text-xs">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent align="start">
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="font-mono text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right side: Page Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First page button */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1 || isLoading}
          title="Halaman pertama"
          aria-label="Halaman pertama"
        >
          <ChevronsLeft className="size-3.5" />
        </Button>

        {/* Previous page button */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1 || isLoading}
          title="Halaman sebelumnya"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="size-3.5" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 px-0.5">
          {pageNumbers.map((p) => {
            if (p === "ellipsis-left" || p === "ellipsis-right") {
              return (
                <span
                  key={p}
                  className="flex size-7 select-none items-center justify-center font-mono text-muted-foreground text-xs"
                >
                  …
                </span>
              );
            }

            const pageNum = p as number;
            const isActive = pageNum === safeCurrentPage;

            return (
              <Button
                key={pageNum}
                variant={isActive ? "default" : "ghost"}
                size="icon-sm"
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "font-mono text-xs",
                  isActive ? "font-semibold shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        {/* Next page button */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= safeTotalPages || isLoading}
          title="Halaman berikutnya"
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="size-3.5" />
        </Button>

        {/* Last page button */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safeCurrentPage >= safeTotalPages || isLoading}
          title="Halaman terakhir"
          aria-label="Halaman terakhir"
        >
          <ChevronsRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
