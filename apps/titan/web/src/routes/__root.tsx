import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { MainLayout } from '../layouts/MainLayout';

/**
 * Central QueryClient instance for TanStack Query.
 * Configured with conservative defaults for data freshness.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Root layout component wrapping the entire application.
 * Provides QueryClientProvider and the MainLayout shell.
 */
function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout>
        <Outlet />
      </MainLayout>
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({ component: RootLayout });
