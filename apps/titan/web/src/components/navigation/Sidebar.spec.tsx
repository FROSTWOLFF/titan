import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';

// Mock the TanStack Router hooks
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className, 'data-testid': testId }: { children: React.ReactNode; to: string; className: string; 'data-testid'?: string }) => (
    <a href={to} className={className} data-testid={testId}>{children}</a>
  ),
  useRouterState: () => ({
    location: { pathname: '/' },
  }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render TITAN branding', () => {
    render(<Sidebar />);
    expect(screen.getByText('TITAN')).toBeInTheDocument();
  });

  it('should render all 6 navigation links', () => {
    render(<Sidebar />);

    expect(screen.getByTestId('nav-dashboard')).toHaveAttribute('href', '/');
    expect(screen.getByTestId('nav-personnel')).toHaveAttribute('href', '/personnel');
    expect(screen.getByTestId('nav-trainings')).toHaveAttribute('href', '/trainings');
    expect(screen.getByTestId('nav-roles')).toHaveAttribute('href', '/roles');
    expect(screen.getByTestId('nav-areas')).toHaveAttribute('href', '/areas');
    expect(screen.getByTestId('nav-reports')).toHaveAttribute('href', '/reports');
  });

  it('should render version footer', () => {
    render(<Sidebar />);
    expect(screen.getByText('v1.0.0-MVP')).toBeInTheDocument();
  });

  it('should have correct sidebar test id', () => {
    render(<Sidebar />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });
});
