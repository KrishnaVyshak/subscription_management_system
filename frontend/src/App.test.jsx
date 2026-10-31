import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from './api/client';
import App from './App';

vi.mock('./api/client', () => ({ api: { get: vi.fn() } }));

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test('shows API and database status from /api/health', async () => {
  vi.mocked(api.get).mockResolvedValue({
    data: { status: 'ok', db: 'up', serverTime: '2026-10-31T12:00:00+05:30', today: '2026-10-31' },
  });

  renderApp();

  expect(await screen.findByText('2026-10-31')).toBeInTheDocument();
  expect(screen.getByText('Database')).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('/health', expect.any(Object));
});
