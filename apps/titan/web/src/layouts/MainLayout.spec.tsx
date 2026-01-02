import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainLayout } from './MainLayout';

// Mock the TanStack Router hooks
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className, 'data-testid': testId }: { children: React.ReactNode; to: string; className: string; 'data-testid'?: string }) => (
    <a href={to} className={className} data-testid={testId}>{children}</a>
  ),
  useRouterState: () => ({
    location: { pathname: '/' },
  }),
}));

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the main layout wrapper', () => {
    render(<MainLayout><div>Test</div></MainLayout>);
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });

  it('should render the Sidebar component', () => {
    render(<MainLayout><div>Test</div></MainLayout>);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('should render the Header component', () => {
    render(<MainLayout><div>Test</div></MainLayout>);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('should render the main content area', () => {
    render(<MainLayout><div>Test</div></MainLayout>);
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('should render children in the main content area', () => {
    render(<MainLayout><div data-testid="child-content">Test Content</div></MainLayout>);
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should have slate-50 background on main content', () => {
    render(<MainLayout><div>Test</div></MainLayout>);
    const mainContent = screen.getByTestId('main-content');
    expect(mainContent).toHaveClass('bg-slate-50');
  });
});
