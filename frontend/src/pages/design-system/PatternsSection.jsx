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
  CreditCard,
  LayoutDashboard,
  Package,
  Percent,
  Plus,
  Receipt,
  Repeat,
  Search,
  Settings,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { LoopPattern } from '@/components/brand/loop-pattern';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/ui/stat-card';
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
import { Section } from './layout';
import { PLANS, invoices, mrrTrend, revenueByPlan } from './sample-data';

const nav = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Subscriptions', icon: Repeat },
  { label: 'Invoices', icon: Receipt },
  { label: 'Customers', icon: Users },
  { label: 'Products', icon: Package },
  { label: 'Discounts', icon: Percent },
  { label: 'Settings', icon: Settings },
];

// Shared chart chrome: recessive axes and grid, tokens so both themes work.
const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: 'var(--chart-axis)', fontSize: 12 },
};

function ChartTooltip({ active, payload, label, showTotal }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs shadow-overlay">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {[...payload].reverse().map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span
              className="size-2 rounded-sm"
              style={{ background: p.color }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-medium text-foreground tabular-nums">
              {formatCurrency(p.value)}
            </span>
          </div>
        ))}
        {showTotal && (
          <div className="flex justify-between border-t pt-1 font-semibold text-foreground">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MrrChart() {
  const [months, setMonths] = useState('12');
  const data = mrrTrend.slice(-Number(months));
  const latest = data.at(-1).mrr;
  return (
    <Card className="@6xl:col-span-2">
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
        <p className="pt-1 type-figure">{formatCurrency(latest)}</p>
      </CardHeader>
      <CardContent className="pt-2 pl-1">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="mrr-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="month" {...axisProps} tickMargin={8} />
              <YAxis
                {...axisProps}
                width={64}
                tickFormatter={(v) => formatCurrency(v, { compact: true })}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
              />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="mrr"
                name="MRR"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#mrr-fill)"
                activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
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
        <CardContent className="pt-3">
          <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {PLANS.map((p) => (
              <li key={p.key} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ background: p.color }}
                  aria-hidden="true"
                />
                {p.label}
              </li>
            ))}
          </ul>
          <TabsContent value="chart" className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByPlan} margin={{ top: 4, right: 0, bottom: 0, left: -12 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="month" {...axisProps} tickMargin={8} />
                <YAxis {...axisProps} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
                <Tooltip
                  content={<ChartTooltip showTotal />}
                  cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
                />
                {PLANS.map((p, i) => (
                  <Bar
                    isAnimationActive={false}
                    key={p.key}
                    dataKey={p.key}
                    name={p.label}
                    stackId="plans"
                    fill={p.color}
                    stroke="var(--card)"
                    strokeWidth={2}
                    maxBarSize={28}
                    radius={i === PLANS.length - 1 ? [4, 4, 0, 0] : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="table" className="-mx-5 h-56 overflow-y-auto">
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
        </CardContent>
      </Tabs>
    </Card>
  );
}

function RecentInvoices() {
  return (
    <Card className="@3xl:col-span-2 @6xl:col-span-3">
      <CardHeader
        action={
          <Button variant="outline" size="sm">
            View all
          </Button>
        }
      >
        <CardTitle>Recent invoices</CardTitle>
        <CardDescription>Raised automatically from active subscriptions</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-1">
        <ul className="divide-y">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={inv.customer} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{inv.customer}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {inv.id} · due {inv.due}
                </p>
              </div>
              <StatusBadge status={inv.status} className="hidden sm:inline-flex" />
              <span className="w-24 text-right font-medium tabular-nums">
                {formatCurrency(inv.amount)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function PatternsSection() {
  return (
    <Section
      id="patterns"
      eyebrow="03 · Patterns"
      title="The finance dashboard"
      description="Components composed into a real screen: the Ink rail anchors the brand, Paper keeps the data calm, Tide drives every action and Volt marks the one number that matters."
    >
      <div className="overflow-hidden rounded-3xl border bg-background shadow-overlay">
        <div className="flex min-h-176">
          <aside className="relative isolate hidden w-60 shrink-0 flex-col overflow-hidden bg-sidebar p-4 text-sidebar-foreground md:flex">
            <LoopPattern
              rings={6}
              className="absolute -bottom-32 -left-32 -z-10 size-96 text-white/5"
            />
            <div className="px-2 py-1.5 text-white">
              <Logo tone="volt" />
            </div>
            <p className="mt-8 px-3 type-overline text-white/35">Workspace</p>
            <nav className="mt-2 space-y-0.5" aria-label="Preview navigation">
              {nav.map(({ label, icon: Icon, active }) => (
                <a
                  key={label}
                  href="#patterns"
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-muted text-white'
                      : 'hover:bg-sidebar-muted/60 hover:text-white',
                  )}
                >
                  <Icon className={cn('size-4', active && 'text-volt-300')} aria-hidden="true" />
                  {label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="ml-auto size-1.5 rounded-full bg-volt-300 shadow-[0_0_8px_2px] shadow-volt-300/50"
                    />
                  )}
                </a>
              ))}
            </nav>
            <div className="mt-auto flex items-center gap-2.5 rounded-2xl border border-sidebar-border p-2.5">
              <Avatar name="Meera Nair" size="sm" />
              <div className="min-w-0 text-xs">
                <p className="truncate font-medium text-white">Meera Nair</p>
                <p className="text-white/45">Admin</p>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="flex items-center gap-3 border-b bg-card/70 px-4 py-3 backdrop-blur sm:px-6">
              <Input
                leading={<Search />}
                placeholder="Search customers, invoices…"
                className="max-w-xs flex-1"
                aria-label="Search"
              />
              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  <Bell />
                </Button>
                <Button>
                  <Plus /> <span className="hidden sm:inline">New subscription</span>
                </Button>
              </div>
            </header>

            <div className="@container space-y-6 p-4 sm:p-6">
              <div>
                <h3 className="type-h1">Good afternoon, Meera</h3>
                <p className="text-muted-foreground">Here’s how billing is tracking this month.</p>
              </div>

              <div className="grid gap-4 @md:grid-cols-2 @4xl:grid-cols-4">
                <StatCard
                  featured
                  label="MRR"
                  value={formatCurrency(1245000, { compact: true })}
                  delta={4.9}
                  icon={TrendingUp}
                />
                <StatCard label="Active subscriptions" value="1,284" delta={2.3} icon={Repeat} />
                <StatCard
                  label="Collected (Oct)"
                  value={formatCurrency(1098000, { compact: true })}
                  delta={-1.8}
                  icon={Wallet}
                />
                <StatCard label="Churn rate" value="1.9%" delta={-0.4} invert icon={CreditCard} />
              </div>

              <div className="grid gap-6 @3xl:grid-cols-2 @6xl:grid-cols-3">
                <MrrChart />
                <RevenueByPlan />
                <RecentInvoices />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
