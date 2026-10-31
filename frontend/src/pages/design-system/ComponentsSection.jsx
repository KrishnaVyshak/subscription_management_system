import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Inbox, Mail, Pause, Plus, Search, Sparkles, Trash } from 'lucide-react';
import { BILLING_PERIODS, INVOICE_STATUS, SUBSCRIPTION_STATUS } from '@brightloop/shared';
import { LoopPattern } from '@/components/brand/loop-pattern';
import { formatCurrency } from '@/lib/format';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Section, Specimen } from './layout';
import { subscriptions } from './sample-data';

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function ButtonsSpecimen() {
  const [saving, setSaving] = useState(false);
  const save = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1500);
  };

  return (
    <Specimen
      title="Buttons"
      note="Click any button: the loop ripple is the brand's press feedback"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Plus /> New subscription
          </Button>
          <Button variant="accent">
            <Sparkles /> Upgrade plan
          </Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="outline">
            <Download /> Export
          </Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">
            <Trash /> Delete
          </Button>
          <Button variant="link">View invoice</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" variant="outline" aria-label="Search">
            <Search />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Pause">
            <Pause />
          </Button>
          <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
          <Button loading={saving} onClick={save}>
            {saving ? 'Saving…' : 'Click to load'}
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      </div>
    </Specimen>
  );
}

function BadgesSpecimen() {
  return (
    <Specimen title="Badges & status" note="Every lifecycle state has exactly one tone">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="brand">Brand</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="info">Info</Badge>
          <Badge tone="volt">
            <Sparkles className="size-3" aria-hidden="true" /> New
          </Badge>
          <Badge tone="outline">Outline</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 type-overline text-muted-foreground">Subscription</p>
            <div className="flex flex-wrap gap-2">
              {Object.values(SUBSCRIPTION_STATUS).map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 type-overline text-muted-foreground">Invoice</p>
            <div className="flex flex-wrap gap-2">
              {Object.values(INVOICE_STATUS).map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Specimen>
  );
}

function FormSpecimen() {
  const [autoRenew, setAutoRenew] = useState(true);
  return (
    <Specimen
      title="Forms"
      note="Field wires up label, hint, error and aria for you"
      className="p-0 sm:p-0"
    >
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <Field label="Customer email" required hint="Invoices are sent here.">
            <Input type="email" placeholder="name@company.com" leading={<Mail />} />
          </Field>
          <Field label="Plan" required>
            <Select defaultValue="growth">
              <option value="starter">Starter · ₹999 / month</option>
              <option value="growth">Growth · ₹4,999 / month</option>
              <option value="enterprise">Enterprise · custom</option>
            </Select>
          </Field>
          <Field label="Billing period">
            <Select defaultValue="monthly">
              {BILLING_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {capitalize(p)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Discount" error="Discount can't exceed 50% without admin approval.">
            <Input type="number" defaultValue="65" trailing="%" />
          </Field>
          <Field label="Unit price" hint="Excluding GST.">
            <Input type="number" defaultValue="4999" leading="₹" />
          </Field>
          <Field label="Start date">
            <Input type="date" defaultValue="2026-11-01" />
          </Field>
          <Field label="Internal note" className="sm:col-span-2">
            <Textarea placeholder="Visible to staff only" />
          </Field>
          <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-start sm:justify-between">
            <Checkbox
              defaultChecked
              label="Email the quotation"
              description="The customer receives a link to review and confirm."
            />
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
              <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
              Auto-renew {autoRenew ? 'on' : 'off'}
            </label>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 rounded-b-2xl border-t bg-muted/40 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="ghost">Cancel</Button>
          <Button variant="outline">Save as draft</Button>
          <Button type="submit">Create quotation</Button>
        </div>
      </form>
    </Specimen>
  );
}

function AlertsSpecimen() {
  return (
    <Specimen title="Alerts" note="Icon + title + text; colour is never the only signal">
      <div className="grid gap-3 lg:grid-cols-2">
        <Alert tone="info" title="Prices include GST">
          Tax is calculated at 18% on all Indian invoices.
        </Alert>
        <Alert tone="success" title="Payment received">
          ₹5,899 from Aarav Mehta was applied to INV-2208.
        </Alert>
        <Alert
          tone="warning"
          title="3 invoices due this week"
          action={
            <Button size="sm" variant="outline">
              Review
            </Button>
          }
        >
          Send reminders before Friday.
        </Alert>
        <Alert tone="danger" title="Card declined">
          The payment for SUB-1039 failed. Ask the customer to update their card.
        </Alert>
      </div>
    </Specimen>
  );
}

function OverlaysSpecimen() {
  const [open, setOpen] = useState(false);
  return (
    <Specimen title="Dialogs & toasts">
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Pause /> Pause subscription…
        </Button>
        <Button variant="outline" onClick={() => toast.success('Invoice INV-2208 sent')}>
          Success toast
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.error('Payment failed', { description: 'The card ending 4242 was declined.' })
          }
        >
          Error toast
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast('Subscription paused', {
              description: 'SUB-1042 will resume on 1 Dec.',
              action: { label: 'Undo', onClick: () => toast.success('Resumed') },
            })
          }
        >
          Toast with action
        </Button>
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Pause SUB-1042?"
        description="Billing stops immediately. You can resume at any time."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Keep active
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                toast.success('Subscription paused');
              }}
            >
              Pause subscription
            </Button>
          </>
        }
      >
        <Field label="Resume on" hint="Leave empty to pause indefinitely.">
          <Input type="date" />
        </Field>
      </Dialog>
    </Specimen>
  );
}

function TabsSpecimen() {
  return (
    <Specimen
      title="Tabs"
      note="Segmented for view switches · underline for page sections · ← → keys"
    >
      <div className="space-y-6">
        <Tabs defaultValue="month">
          <TabsList aria-label="Period">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs defaultValue="overview">
          <TabsList variant="underline" aria-label="Subscription">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="invoices">
              Invoices <Badge className="px-1.5">4</Badge>
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="pt-4 text-muted-foreground">
            Plan, billing period and next invoice at a glance.
          </TabsContent>
          <TabsContent value="invoices" className="pt-4 text-muted-foreground">
            Every invoice raised for this subscription.
          </TabsContent>
          <TabsContent value="activity" className="pt-4 text-muted-foreground">
            Status changes and who made them.
          </TabsContent>
        </Tabs>
      </div>
    </Specimen>
  );
}

function FeedbackSpecimen() {
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <Specimen title="Progress & avatars">
        <div className="space-y-5">
          {[
            { label: 'Seats used', value: 42, max: 50, tone: 'warning' },
            { label: 'Collected this month', value: 78, max: 100, tone: 'success' },
            { label: 'Trial elapsed', value: 9, max: 14, tone: 'brand' },
          ].map(({ label, value, max, tone }) => (
            <div key={label}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {value} / {max}
                </span>
              </div>
              <Progress value={value} max={max} tone={tone} label={label} />
            </div>
          ))}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex -space-x-2">
              {subscriptions.map((s) => (
                <Avatar key={s.id} name={s.customer} className="ring-2 ring-card" />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">5 customers renewing this week</span>
          </div>
        </div>
      </Specimen>

      <Specimen title="Loading" note="Skeletons mirror the layout they replace">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </Specimen>

      <div className="lg:col-span-2">
        <Specimen title="Empty state" className="p-3 sm:p-3">
          <EmptyState
            icon={Inbox}
            title="No invoices yet"
            description="Invoices appear here once a subscription is confirmed and its first billing date arrives."
            action={
              <Button>
                <Plus /> Create subscription
              </Button>
            }
          />
        </Specimen>
      </div>
    </div>
  );
}

function CardsAndTableSpecimen() {
  return (
    <div className="space-y-10">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader action={<Badge tone="volt">Popular</Badge>}>
            <CardTitle>Growth</CardTitle>
            <CardDescription>For teams billing every month.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="type-figure">
              ₹4,999
              <span className="font-sans text-sm tracking-normal text-muted-foreground">
                {' '}
                / month
              </span>
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Choose plan</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Next invoice</CardTitle>
            <CardDescription>INV-2209 · due 12 Nov 2026</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">₹4,999</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST (18%)</span>
              <span className="tabular-nums">₹900</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">₹5,899</span>
            </div>
          </CardContent>
        </Card>
        <Card className="relative isolate overflow-hidden border-sidebar-border bg-sidebar text-white">
          <LoopPattern
            rings={6}
            spark
            className="absolute -right-24 -bottom-24 -z-10 size-72 text-white/10"
          />
          <CardContent className="flex h-full flex-col justify-between gap-8">
            <div>
              <p className="type-overline text-volt-300">Brand card</p>
              <p className="mt-3 type-statement">
                Annual billing saves customers two months.
              </p>
            </div>
            <Button variant="accent" className="self-start">
              Offer yearly plans
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="type-h3">Data table</h3>
          <p className="text-xs text-muted-foreground">
            Numeric columns right-aligned with tabular figures
          </p>
        </div>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <Input
              leading={<Search />}
              placeholder="Search subscriptions…"
              className="sm:w-72"
              aria-label="Search subscriptions"
            />
            <div className="flex gap-2">
              <Select defaultValue="all" className="w-40" aria-label="Status filter">
                <option value="all">All statuses</option>
                {Object.values(SUBSCRIPTION_STATUS).map((s) => (
                  <option key={s} value={s}>
                    {capitalize(s)}
                  </option>
                ))}
              </Select>
              <Button variant="outline">
                <Download /> Export
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Customer</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
                <TableHead numeric>Amount</TableHead>
                <TableHead>Next billing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={s.customer} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium">{s.customer}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{s.plan}</p>
                    <p className="font-mono text-xs text-muted-foreground">{s.id}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell numeric>
                    <span className="font-medium">{formatCurrency(s.amount)}</span>
                    <span className="block text-xs text-muted-foreground">{s.period}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {s.nextBilling}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>Showing 1–5 of 128</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function ComponentsSection() {
  return (
    <Section
      id="components"
      eyebrow="02 · Components"
      title="Components"
      description="Primitives in src/components/ui. Each one takes className for layout tweaks; variants cover the visual choices so screens stay consistent."
    >
      <ButtonsSpecimen />
      <BadgesSpecimen />
      <FormSpecimen />
      <AlertsSpecimen />
      <div className="grid gap-10 lg:grid-cols-2">
        <TabsSpecimen />
        <OverlaysSpecimen />
      </div>
      <CardsAndTableSpecimen />
      <FeedbackSpecimen />
    </Section>
  );
}
