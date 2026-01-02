import { createFileRoute } from '@tanstack/react-router';
import {
  LayoutDashboard,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react';

/**
 * Dashboard Hero Card Component
 * Displays a key metric with icon and color-coded styling.
 */
interface HeroCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly icon: React.ReactNode;
  readonly variant: 'success' | 'danger' | 'info';
}

function HeroCard({ title, value, icon, variant }: HeroCardProps) {
  const variantStyles = {
    success: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    danger: 'border-red-500 bg-red-50 text-red-700',
    info: 'border-blue-500 bg-blue-50 text-blue-700',
  } as const;

  return (
    <div
      className={`flex items-center gap-4 rounded-md border-l-4 bg-white p-6 shadow-sm ${variantStyles[variant]}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

/**
 * Dashboard Index Page
 * Displays Traffic Light overview with Compliance Score, Critical Actions, and Verification Queue.
 */
function DashboardPage() {
  // TODO: Replace with real data from TanStack Query
  const mockData = {
    complianceScore: '82%',
    expiredCount: 14,
    pendingVerifications: 5,
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Training compliance overview and critical actions
          </p>
        </div>
      </div>

      {/* Hero Cards Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <HeroCard
          title="Compliance Score"
          value={mockData.complianceScore}
          icon={<LayoutDashboard className="h-8 w-8" />}
          variant="danger"
        />
        <HeroCard
          title="Critical Actions"
          value={`${mockData.expiredCount} Expired`}
          icon={<AlertTriangle className="h-8 w-8" />}
          variant="danger"
        />
        <HeroCard
          title="Verification Queue"
          value={`${mockData.pendingVerifications} Pending`}
          icon={<ClipboardCheck className="h-8 w-8" />}
          variant="info"
        />
      </div>

      {/* Watchlist Placeholder */}
      <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-700">
          The Watchlist
        </h2>
        <p className="text-sm text-slate-500">
          Critical expiring and expired items will be displayed here.
        </p>
        {/* TODO: DataGrid component with most critical items */}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/')(
  { component: DashboardPage }
);
