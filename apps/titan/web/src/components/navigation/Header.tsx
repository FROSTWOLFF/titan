import { useRouterState } from '@tanstack/react-router';
import { Search, Bell, User } from 'lucide-react';

/**
 * Breadcrumb segment derived from current route path.
 */
function Breadcrumbs() {
  const router = useRouterState();
  const pathname = router.location.pathname;

  // Generate breadcrumb segments from pathname
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

  // Default to "Dashboard" for root path
  const displaySegments = segments.length > 0 ? segments : ['Dashboard'];

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-slate-500">
      {displaySegments.map((segment, index) => (
        <span key={segment} className="flex items-center">
          {index > 0 && <span className="mx-2">/</span>}
          <span className={index === displaySegments.length - 1 ? 'text-slate-700 font-medium' : ''}>
            {segment}
          </span>
        </span>
      ))}
    </nav>
  );
}

/**
 * Global search input component.
 * Placeholder for the "Omnisearch" functionality.
 */
function GlobalSearch() {
  return (
    <div className="relative w-96">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        placeholder="Search by Name, Role, or ID... (Press /)"
        className="w-full rounded-md border-none bg-slate-100 py-2 pl-10 pr-4 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
        data-testid="global-search"
      />
    </div>
  );
}

/**
 * User profile section with notification bell and avatar.
 */
function UserProfile() {
  return (
    <div className="flex items-center gap-4" data-testid="user-profile">
      {/* Notification Bell */}
      <button
        type="button"
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {/* TODO: Badge for unread notifications */}
      </button>

      {/* User Avatar */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
          <User className="h-4 w-4 text-slate-600" />
        </div>
        <span className="text-sm font-medium text-slate-700">Admin</span>
      </div>
    </div>
  );
}

/**
 * Application Header Component
 *
 * Sticky top bar with breadcrumbs, global search, and user profile.
 * Follows "Bloomberg for Safety" design with high-density information display.
 *
 * @see SPEC-LAYOUT-001 Section 2.2
 */
export function Header() {
  return (
    <header
      className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8"
      data-testid="header"
    >
      {/* Left: Breadcrumbs */}
      <Breadcrumbs />

      {/* Center: Global Search */}
      <GlobalSearch />

      {/* Right: User Profile */}
      <UserProfile />
    </header>
  );
}
