import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';

// Mock the TanStack Router hooks
vi.mock('@tanstack/react-router', () => ({
  useRouterState: () => ({
    location: { pathname: '/' },
  }),
}));

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the header element', () => {
    render(<Header />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('should render the global search input', () => {
    render(<Header />);
    const searchInput = screen.getByTestId('global-search');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute(
      'placeholder',
      'Search by Name, Role, or ID... (Press /)'
    );
  });

  it('should render the user profile section', () => {
    render(<Header />);
    expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('should display Dashboard breadcrumb on root path', () => {
    render(<Header />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
