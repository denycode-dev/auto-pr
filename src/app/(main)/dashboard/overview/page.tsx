import { ActiveQueuePreview } from "./_components/active-queue-preview";
import { MetricCards } from "./_components/metric-cards";
import { OverviewHeader } from "./_components/overview-header";
import { RecommendationDistribution } from "./_components/recommendation-distribution";
import { SeverityBreakdown } from "./_components/severity-breakdown";

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <OverviewHeader />
      <MetricCards />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecommendationDistribution />
        <SeverityBreakdown />
      </div>

      <ActiveQueuePreview />
    </div>
  );
}
