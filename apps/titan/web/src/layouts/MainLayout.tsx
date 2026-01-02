import type { ReactNode } from 'react';
import { Sidebar } from '../components/navigation/Sidebar';
import { Header } from '../components/navigation/Header';

/**
 * Props for MainLayout component
 */
interface MainLayoutProps {
  readonly children: ReactNode;
}

/**
 * Main Application Layout Component
 *
 * Composes the Sidebar, Header, and main content area into the
 * application shell. Follows the "Console" grid pattern from SPEC-LAYOUT-001.
 *
 * Layout:
 * - Sidebar: Fixed 256px left panel
 * - Header: Sticky 64px top bar
 * - Main: Scrollable content area with slate-50 background
 *
 * @see SPEC-LAYOUT-001 Section 1 "Global Structure"
 */
export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50" data-testid="main-layout">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="ml-64 flex flex-1 flex-col">
        {/* Sticky Header */}
        <Header />

        {/* Scrollable Content */}
        <main
          className="flex-1 overflow-auto bg-slate-50 p-8"
          data-testid="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
