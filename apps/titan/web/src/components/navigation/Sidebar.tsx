import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Briefcase,
  Map,
  FileSpreadsheet,
} from 'lucide-react';

/**
 * Navigation item configuration type
 */
interface NavItem {
  readonly label: string;
  readonly to: string;
  readonly icon: React.ReactNode;
}

/**
 * Phase 1 navigation items as per SPEC-LAYOUT-001
 */
const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', to: '/', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Personnel', to: '/personnel', icon: <Users className="h-5 w-5" /> },
  { label: 'Trainings', to: '/trainings', icon: <BookOpen className="h-5 w-5" /> },
  { label: 'Roles', to: '/roles', icon: <Briefcase className="h-5 w-5" /> },
  { label: 'Areas', to: '/areas', icon: <Map className="h-5 w-5" /> },
  { label: 'Reports', to: '/reports', icon: <FileSpreadsheet className="h-5 w-5" /> },
] as const;

/**
 * Individual navigation link component with active state styling.
 */
function NavLink({ item }: { readonly item: NavItem }) {
  const router = useRouterState();
  const isActive = router.location.pathname === item.to;

  const baseStyles =
    'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors';
  const activeStyles = 'bg-slate-800 text-white border-l-4 border-emerald-500';
  const idleStyles =
    'text-slate-400 hover:bg-slate-800 hover:text-slate-100 border-l-4 border-transparent';

  return (
    <Link
      to={item.to}
      className={`${baseStyles} ${isActive ? activeStyles : idleStyles}`}
      data-testid={`nav-${item.label.toLowerCase()}`}
    >
      {item.icon}
      <span>{item.label}</span>
    </Link>
  );
}

/**
 * Application Sidebar Component
 *
 * Fixed left navigation panel with TITAN branding, navigation links,
 * and version footer. Follows "Bloomberg for Safety" design philosophy.
 *
 * @see SPEC-LAYOUT-001 Section 2.1
 */
export function Sidebar() {
  return (
    <aside
      className="fixed left-0 top-0 flex h-screen w-64 flex-col bg-slate-900"
      data-testid="sidebar"
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6">
        <span className="text-xl font-bold tracking-tight text-white">
          TITAN
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4" role="navigation" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} item={item} />
        ))}
      </nav>

      {/* Version Footer */}
      <div className="border-t border-slate-800 px-6 py-4">
        <span className="text-xs text-slate-500">v1.0.0-MVP</span>
      </div>
    </aside>
  );
}
