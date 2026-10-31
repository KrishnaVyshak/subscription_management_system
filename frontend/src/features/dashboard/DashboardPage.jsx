import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard, ChartLegend, ChartTooltip } from '@/components/app/chart-card';
import { MoneyCell } from '@/components/app/cells';
import { SimpleTable } from '@/components/app/data-table';
import { DateRangeFilter } from '@/components/app/filter-bar';
import { KpiCard, MetricStrip } from '@/components/app/kpi-card';
import { Page, PageHeader } from '@/components/app/page-header';
import { useAuth } from '@/auth/context';
import { useListParams } from '@/hooks/use-list-params';
import { api } from '@/lib/api';
import { axisProps, CHART_COLORS, moneyTick } from '@/lib/chart';
import { presetRange } from '@/lib/dates';
import { formatMoney, formatMonth, formatNumber } from '@/lib/format';

const get = (key, url, params) => useQuery({ queryKey: ['report', key, params], queryFn: () => api.get(url, params).then((r) => r.data) });

export default function DashboardPage() {
  const { user } = useAuth();
  const { params, set } = useListParams(presetRange('this_month'));
  const range = { from: params.from, to: params.to };
  const summary = get('summary', '/reports/summary', range);
  const trend = get('trend', '/reports/revenue-trend', { months: 12 });
  const byPlan = get('plan', '/reports/by-plan', range);
  const top = get('top', '/reports/top-customers', { ...range, limit: 10 });
  const receiv = useQuery({ queryKey: ['receivables', 'summary'], queryFn: () => api.get('/receivables/summary').then((r) => r.data) });
  const s = summary.data;
  const l = !s;

  return (
    <Page>
      <PageHeader
        title="Dashboard" description={`Welcome back, ${user?.fullName ?? user?.email}`}
        actions={<DateRangeFilter label="Period" from={params.from} to={params.to} onChange={(r) => set(r)} />}
      />
      <MetricStrip className="sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard featured label="MRR" loading={l} value={formatMoney(s?.mrr)} hint={`ARR ${formatMoney(s?.arr)}`} />
        <KpiCard label="Active subscriptions" loading={l} value={formatNumber(s?.activeSubscriptions)} hint={`${s?.pausedSubscriptions ?? 0} paused`} to="/app/subscriptions?status=active" />
        <KpiCard label="Invoiced" loading={l} value={formatMoney(s?.invoiced)} to="/app/invoices" />
        <KpiCard label="Collected" loading={l} value={formatMoney(s?.collected)} to="/app/payments" />
        <KpiCard label="Outstanding" loading={l} value={formatMoney(s?.outstanding)} to="/app/receivables" />
        <KpiCard label="Overdue" tone="danger" loading={l} value={formatMoney(s?.overdue)} hint={`${s?.overdueInvoices ?? 0} invoices`} to="/app/invoices?overdue=true" />
        <KpiCard label="New subscriptions" loading={l} value={formatNumber(s?.newSubscriptions)} />
        <KpiCard label="Churned" loading={l} value={formatNumber(s?.churnedSubscriptions)} />
      </MetricStrip>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2" title="Revenue" description="Invoiced vs collected, last 12 months" query={trend}
          legend={<ChartLegend items={[{ label: 'Invoiced', color: CHART_COLORS[0] }, { label: 'Collected', color: CHART_COLORS[1] }]} />}
          empty={trend.data && !trend.data.some((m) => Number(m.invoiced)) ? 'No invoices in this period' : null}
          table={
            <SimpleTable label="Revenue by month" rows={trend.data} getRowId={(r) => r.month} columns={[
              { id: 'm', header: 'Month', cell: (r) => formatMonth(`${r.month}-01`) },
              { id: 'i', header: 'Invoiced', numeric: true, cell: (r) => <MoneyCell value={r.invoiced} /> },
              { id: 'c', header: 'Collected', numeric: true, cell: (r) => <MoneyCell value={r.collected} /> },
            ]} />
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(trend.data ?? []).map((r) => ({ ...r, invoiced: Number(r.invoiced), collected: Number(r.collected) }))}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="month" tickFormatter={(m) => formatMonth(`${m}-01`)} {...axisProps} />
              <YAxis tickFormatter={moneyTick} width={52} {...axisProps} />
              <Tooltip content={<ChartTooltip labelFormatter={(m) => formatMonth(`${m}-01`, 'MMMM yyyy')} />} cursor={{ fill: 'var(--sunken)' }} />
              <Bar dataKey="invoiced" name="Invoiced" fill={CHART_COLORS[0]} radius={[2, 2, 0, 0]} />
              <Bar dataKey="collected" name="Collected" fill={CHART_COLORS[1]} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Receivables ageing" description="Outstanding by days overdue" query={receiv} height="h-60"
          table={receiv.data && <AgeingTable a={receiv.data.ageing} />}>
          {receiv.data && <AgeingTable a={receiv.data.ageing} />}
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Revenue by plan" query={byPlan} height="h-72" empty={byPlan.data && !byPlan.data.rows.length ? 'No plans yet' : null}>
          <SimpleTable label="By plan" rows={byPlan.data?.rows} getRowId={(r) => r.planId} columns={[
            { id: 'p', header: 'Plan', cell: (r) => r.planName },
            { id: 'a', header: 'Active', numeric: true, cell: (r) => r.activeSubscriptions },
            { id: 'm', header: 'MRR', numeric: true, cell: (r) => <MoneyCell value={r.mrr} /> },
            { id: 'i', header: 'Invoiced', numeric: true, cell: (r) => <MoneyCell value={r.invoiced} /> },
          ]} />
        </ChartCard>
        <ChartCard title="Top customers" query={top} height="h-72" empty={top.data && !top.data.rows.length ? 'No invoices yet' : null}>
          <SimpleTable label="Top customers" rows={top.data?.rows} getRowId={(r) => r.customerId} columns={[
            { id: 'c', header: 'Customer', cell: (r) => r.name },
            { id: 'i', header: 'Invoiced', numeric: true, cell: (r) => <MoneyCell value={r.invoiced} /> },
            { id: 'p', header: 'Paid', numeric: true, cell: (r) => <MoneyCell value={r.paid} /> },
            { id: 'o', header: 'Outstanding', numeric: true, cell: (r) => <MoneyCell value={r.outstanding} /> },
          ]} />
        </ChartCard>
      </div>
    </Page>
  );
}

function AgeingTable({ a }) {
  const rows = [
    ['Not due', a.notDue], ['1–30 days', a.days130], ['31–60 days', a.days3160], ['61–90 days', a.days6190], ['90+ days', a.days90Plus],
  ].map(([label, v]) => ({ id: label, label, ...v }));
  return (
    <SimpleTable label="Ageing" rows={rows} columns={[
      { id: 'l', header: 'Bucket', cell: (r) => r.label },
      { id: 'c', header: 'Invoices', numeric: true, cell: (r) => r.count },
      { id: 'a', header: 'Amount', numeric: true, cell: (r) => <MoneyCell value={r.amount} /> },
    ]} />
  );
}
