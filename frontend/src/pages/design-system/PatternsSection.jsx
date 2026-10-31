import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bell,
  LayoutDashboard,
  Package,
  Percent,
  Plus,
  Receipt,
  Repeat,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Metric, MetricStrip } from '@/components/ui/metric';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Section, Specimen } from './layout';
import { PLANS, invoices, mrrTrend, revenueByPlan } from './sample-data';

const nav = [
  {
    group: 'Billing',
    items: [
      { label: 'Overview', icon: LayoutDashboard, active: true },
      { label: 'Subscriptions', icon: Repeat, count: 1284 },
      { label: 'Invoices', icon: Receipt, count: 12 },
      { label: 'Customers', icon: Users },
    ],
  },
  {
    group: 'Catalogue',
    items: [
      { label: 'Products', icon: Package },
      { label: 'Discounts', icon: Percent },
    ],
  },
];

// Shared chart chrome: recessive axes and grid, tokens so both themes work.
const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: 'var(--chart-axis)', fontSize: 11, fontFamily: 'var(--font-mono)' },
};

function ChartTooltip({ active, payload, label, showTotal }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="min-w-44 rounded-md bg-inverse px-3 py-2 text-xs text-inverse-foreground shadow-overlay">
      <p className="mb-1.5 type-label text-inverse-muted">{label}</p>
      <div className="space-y-1">
        {[...payload].reverse().map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="size-2" style={{ background: p.color }} aria-hidden="true" />
            <span>{p.name}</span>
            <span className="ml-auto font-mono tabular-nums">{formatCurrency(p.value)}</span>
          </div>
        ))}
        {showTotal && (
          <div className="flex justify-between border-t border-inverse-muted/40 pt-1 font-medium">
            <span>Total</span>
            <span className="font-mono tabular-nums">{formatCurrency(total)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MrrChart() {
  const [months, setMonths] = useState('12');
  const data = mrrTrend.slice(-Number(months));
  const first = data[0].mrr;
  const latest = data.at(-1).mrr;
  const growth = ((latest - first) / first) * 100;

  return (
    <Card className="@4xl:col-span-2">
      <CardHeader
        action={
          <Tabs value={months} onValueChange={setMonths}>
            <TabsList aria-label="Range">
              <TabsTrigger value="3">3M</TabsTrigger>
              <TabsTrigger value="6">6M</TabsTrigger>
              <TabsTrigger value="12">12M</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        <CardTitle>Monthly recurring revenue</CardTitle>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
          <span className="type-figure">{formatCurrency(latest)}</span>
          <span className="font-mono text-xs text-success-soft-foreground">
            +{growth.toFixed(1)}% over {months} months
          </span>
        </p>
      </CardHeader>
      <div className="h-60 px-2 pt-4 pb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="month" {...axisProps} tickMargin={8} />
            <YAxis
              {...axisProps}
              width={60}
              tickFormatter={(v) => formatCurrency(v, { compact: true })}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '2 3' }}
            />
            {/* Stepped: MRR changes when a billing period turns over, not continuously. */}
            <Area
              isAnimationActive={false}
              type="stepAfter"
              dataKey="mrr"
              name="MRR"
              stroke="var(--chart-1)"
              strokeWidth={1.75}
              fill="var(--chart-1)"
              fillOpacity={0.07}
              activeDot={{ r: 3.5, stroke: 'var(--card)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function RevenueByPlan() {
  return (
    <Card>
      <Tabs defaultValue="chart">
        <CardHeader
          action={
            <TabsList aria-label="View">
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          }
        >
          <CardTitle>Revenue by plan</CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </CardHeader>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-4 type-caption text-muted-foreground sm:px-5">
          {PLANS.map((p) => (
            <li key={p.key} className="flex items-center gap-1.5">
              <span className="size-2" style={{ background: p.color }} aria-hidden="true" />
              {p.label}
            </li>
          ))}
        </ul>
        <TabsContent value="chart" className="h-56 px-2 pt-3 pb-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueByPlan} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="month" {...axisProps} tickMargin={8} />
              <YAxis {...axisProps} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
              <Tooltip
                content={<ChartTooltip showTotal />}
                cursor={{ fill: 'var(--sunken)', opacity: 0.7 }}
              />
              {PLANS.map((p) => (
                <Bar
                  isAnimationActive={false}
                  key={p.key}
                  dataKey={p.key}
                  name={p.label}
                  stackId="plans"
                  fill={p.color}
                  stroke="var(--card)"
                  strokeWidth={1}
                  maxBarSize={22}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
        <TabsContent value="table" className="mt-3 h-56 overflow-y-auto border-t">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Month</TableHead>
                {PLANS.map((p) => (
                  <TableHead key={p.key} numeric>
                    {p.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueByPlan.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="py-2">{row.month}</TableCell>
                  {PLANS.map((p) => (
                    <TableCell key={p.key} numeric className="py-2">
                      {formatCurrency(row[p.key], { compact: true })}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function RecentInvoices() {
  return (
    <Card className="overflow-hidden @4xl:col-span-3">
      <CardHeader
        className="pb-3"
        action={
          <Button variant="secondary" size="sm">
            View all
          </Button>
        }
      >
        <CardTitle>Recent invoices</CardTitle>
        <CardDescription>Raised automatically from active subscriptions</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Customer</TableHead>
            <TableHead className="hidden sm:table-cell">Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead numeric>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell>
                <span className="flex items-center gap-2.5">
                  <Avatar name={inv.customer} size="sm" />
                  <span className="font-medium whitespace-nowrap">{inv.customer}</span>
                </span>
              </TableCell>
              <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                {inv.id} · due {inv.due}
              </TableCell>
              <TableCell>
                <StatusBadge status={inv.status} />
              </TableCell>
              <TableCell numeric>{formatCurrency(inv.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function Rail() {
  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-12 items-center border-b px-4">
        <Logo />
      </div>
      <nav aria-label="Preview navigation" className="space-y-5 px-2 py-4">
        {nav.map(({ group, items }) => (
          <div key={group}>
            <p className="px-2.5 type-label text-subtle-foreground">{group}</p>
            <ul className="mt-1.5 space-y-px">
              {items.map(({ label, icon: Icon, active, count }) => (
                <li key={label}>
                  <a
                    href="#patterns"
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[0.8125rem] outline-none transition-colors duration-75',
                      'focus-visible:outline-2 focus-visible:outline-ring',
                      active
                        ? 'bg-sunken font-medium text-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:bg-accent'
                        : 'text-muted-foreground hover:bg-sunken/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                    {count && (
                      <span className="ml-auto font-mono text-[0.6875rem] text-subtle-foreground tabular-nums">
                        {count.toLocaleString('en-IN')}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t">
        <a
          href="#patterns"
          className="flex h-9 items-center gap-2.5 px-4.5 text-[0.8125rem] text-muted-foreground hover:text-foreground"
        >
          <Settings className="size-4" aria-hidden="true" /> Settings
        </a>
        <div className="flex items-center gap-2.5 border-t px-4 py-3">
          <Avatar name="Meera Nair" size="sm" />
          <div className="min-w-0 text-xs leading-4">
            <p className="truncate font-medium">Meera Nair</p>
            <p className="text-muted-foreground">Admin · Northwind</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function PatternsSection() {
  return (
    <Section
      id="patterns"
      number="03"
      title="Patterns"
      description="Components composed into a real screen. The rail and bar recede, the figures come forward, and Cobalt is spent only on the current route, the headline figure and the first data series."
    >
      <Specimen
        title="Finance overview"
        note="Resize the window: the canvas reflows on its own width"
        wide
        sheet={false}
      >
        <div className="flex min-h-[44rem] overflow-hidden rounded-xl border bg-background">
          <Rail />

          <div className="min-w-0 flex-1">
            <header className="flex h-12 items-center gap-3 border-b bg-card px-3 sm:px-4">
              <p className="hidden shrink-0 text-[0.8125rem] text-muted-foreground lg:block">
                Billing <span className="px-1 text-subtle-foreground">/</span>
                <span className="text-foreground">Overview</span>
              </p>
              <Input
                leading={<Search />}
                placeholder="Search customers, invoices…"
                className="max-w-64 flex-1 lg:ml-6"
                aria-label="Search"
              />
              <div className="ml-auto flex items-center gap-1.5">
                <Button variant="tertiary" size="icon" aria-label="Notifications">
                  <Bell />
                </Button>
                <Button size="sm">
                  <Plus /> <span className="hidden sm:inline">New subscription</span>
                </Button>
              </div>
            </header>

            <div className="@container space-y-4 p-3 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
                <div>
                  <h3 className="type-h1">Overview</h3>
                  <p className="mt-1 text-[0.8125rem] text-muted-foreground">
                    October 2026 · books close in 1 day
                  </p>
                </div>
                <p className="font-mono text-xs text-muted-foreground">Updated 14:32 IST</p>
              </div>

              <MetricStrip className="@md:grid-cols-2 @4xl:grid-cols-[1.35fr_1fr_1fr_1fr]">
                <Metric
                  featured
                  label="MRR"
                  value={formatCurrency(1245000, { compact: true })}
                  delta={4.9}
                />
                <Metric label="Active subscriptions" value="1,284" delta={2.3} />
                <Metric
                  label="Collected (Oct)"
                  value={formatCurrency(1098000, { compact: true })}
                  delta={-1.8}
                />
                <Metric label="Churn rate" value="1.9%" delta={-0.4} invert />
              </MetricStrip>

              <div className="grid gap-4 @4xl:grid-cols-3">
                <MrrChart />
                <RevenueByPlan />
                <RecentInvoices />
              </div>
            </div>
          </div>
        </div>
      </Specimen>
    </Section>
  );
}
