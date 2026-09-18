/**
 * Shared styling tokens and utility classes for dashboard tables.
 * Standardizes left-alignment, compact heights, and sticky action column behavior.
 */

export const dashboardTableStyles = {
  /**
   * Standard left-aligned header cell
   */
  th: "text-xs font-semibold text-left text-muted-foreground",

  /**
   * Sticky right action column header
   */
  thStickyAction:
    "w-[120px] text-left font-semibold text-xs sticky right-0 z-20 border-l bg-card/95 backdrop-blur-xs shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]",

  /**
   * Sticky right action column body cell
   */
  tdStickyAction:
    "sticky right-0 z-10 border-l bg-card/95 backdrop-blur-xs shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] text-left",
};
