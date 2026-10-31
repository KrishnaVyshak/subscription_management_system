import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from '@/lib/api';
import StatusPage from './StatusPage';

vi.mock('@/lib/api', () => ({ http: { get: vi.fn() } }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test('shows API and database status from /api/health', async () => {
  vi.mocked(http.get).mockResolvedValue({
    data: { status: 'ok', db: 'up', serverTime: '2026-10-31T12:00:00+05:30', today: '2026-10-31' },
  });

  renderPage();

  expect(await screen.findByText('2026-10-31')).toBeInTheDocument();
  expect(screen.getByText('Database')).toBeInTheDocument();
  expect(http.get).toHaveBeenCalledWith('/health', expect.any(Object));
});
