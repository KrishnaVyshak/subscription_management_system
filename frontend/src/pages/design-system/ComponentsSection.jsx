import { useId, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  Mail,
  MoreHorizontal,
  Pause,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  BILLING_PERIODS,
  INVOICE_STATUS,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TRANSITIONS,
} from '@brightloop/shared';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

/* Buttons ---------------------------------------------------------------------------------- */

const buttonRows = [
  {
    variant: 'primary',
    name: 'Primary',
    use: 'The one step that moves the task forward. One per view.',
    label: 'Create quotation',
    icon: Plus,
  },
  {
    variant: 'secondary',
    name: 'Secondary',
    use: 'Any other action that changes something.',
    label: 'Export CSV',
    icon: Download,
  },
  {
    variant: 'tertiary',
    name: 'Tertiary',
    use: 'Dismiss, go back, toolbar actions.',
    label: 'Back',
    icon: ArrowLeft,
  },
  {
    variant: 'danger',
    name: 'Destructive',
    use: 'Irreversible. The label names what is lost.',
    label: 'Cancel subscription',
    icon: Trash2,
  },
  {
    variant: 'danger-quiet',
    name: 'Destructive, quiet',
    use: 'Routine removals inside a form or a row.',
    label: 'Remove line',
    icon: X,
  },
];

function RowLabel({ name, code, use }) {
  return (
    <div>
      <p className="text-[0.8125rem] font-medium">
        {name}{' '}
        {code && <code className="font-mono text-[0.6875rem] text-subtle-foreground">{code}</code>}
      </p>
      {use && <p className="type-caption text-muted-foreground">{use}</p>}
    </div>
  );
}

function ButtonsSpecimen() {
  const [saving, setSaving] = useState(false);
  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Draft saved');
    }, 1500);
  };

  const row =
    'grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[13rem_minmax(0,1fr)] md:items-center';

  return (
    <Specimen
      id="buttons"
      title="Buttons"
      note="Hierarchy is fill, not size: Ink, edge, text. Red only when something is lost"
    >
      <ul className="divide-y">
        {buttonRows.map(({ variant, name, use, label, icon: Icon }) => (
          <li key={variant} className={row}>
            <RowLabel name={name} code={variant} use={use} />
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant={variant}>{label}</Button>
              <Button variant={variant}>
                <Icon /> {label}
              </Button>
              <Button variant={variant} size="sm">
                {label}
              </Button>
              <Button variant={variant} disabled>
                Disabled
              </Button>
            </div>
          </li>
        ))}

        <li className={row}>
          <RowLabel name="Link" code="link" use="Navigation inside running text." />
          <p className="text-[0.8125rem]">
            Paid on 12 Oct.{' '}
            <Button variant="link" onClick={() => toast('Opening INV-2208')}>
              View invoice INV-2208
            </Button>
          </p>
        </li>

        <li className={row}>
          <RowLabel name="Icon & toolbar" use="Icon-only buttons always carry an aria-label." />
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="toolbar"
              aria-label="Invoice actions"
              className="inline-flex items-center gap-px rounded-md border bg-card p-0.5"
            >
              <Button variant="tertiary" size="icon-sm" aria-label="Search invoices">
                <Search />
              </Button>
              <Button variant="tertiary" size="icon-sm" aria-label="Download PDF">
                <Download />
              </Button>
              <Button variant="tertiary" size="icon-sm" aria-label="Email to customer">
                <Mail />
              </Button>
              <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
              <Button variant="tertiary" size="icon-sm" aria-label="Pause subscription">
                <Pause />
              </Button>
              <Button
                variant="tertiary"
                size="icon-sm"
                aria-label="Delete draft"
                className="text-danger-soft-foreground hover:bg-danger-soft"
              >
                <Trash2 />
              </Button>
            </div>
            <Button variant="secondary" size="icon" aria-label="More actions">
              <MoreHorizontal />
            </Button>
            <Button variant="primary" size="icon" aria-label="New subscription">
              <Plus />
            </Button>
          </div>
        </li>

        <li className={row}>
          <RowLabel name="Sizes & loading" use="sm 28 · md 36 · lg 44, the touch size on mobile." />
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="secondary" size="sm">
              Small
            </Button>
            <Button variant="secondary">Medium</Button>
            <Button variant="secondary" size="lg">
              Large
            </Button>
            <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-border sm:block" />
            <Button loading={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save draft'}
            </Button>
          </div>
        </li>
      </ul>
    </Specimen>
  );
}

/* Status --------------------------------------------------------------------------------- */

function StatusSpecimen() {
  return (
    <Specimen
      id="status"
      title="Status & badges"
      note="One tone per lifecycle state, read from @brightloop/shared"
      className="p-0 sm:p-0"
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-40">Subscription</TableHead>
            <TableHead>Can move to</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.values(SUBSCRIPTION_STATUS).map((s) => (
            <TableRow key={s}>
              <TableCell>
                <StatusBadge status={s} />
              </TableCell>
              <TableCell>
                {SUBSCRIPTION_TRANSITIONS[s].length ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <ArrowRight aria-hidden="true" className="size-3.5 text-subtle-foreground" />
                    {SUBSCRIPTION_TRANSITIONS[s].map((t) => (
                      <StatusBadge key={t} status={t} />
                    ))}
                  </span>
                ) : (
                  <span className="type-caption text-muted-foreground">Final state</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="grid gap-6 border-t px-4 py-4 sm:grid-cols-2 sm:px-5">
        <div>
          <p className="type-label text-muted-foreground">Invoice</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.values(INVOICE_STATUS).map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
        </div>
        <div>
          <p className="type-label text-muted-foreground">Tones</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['neutral', 'ink', 'accent', 'success', 'warning', 'danger', 'info', 'outline'].map(
              (t) => (
                <Badge key={t} tone={t}>
                  {t}
                </Badge>
              ),
            )}
          </div>
        </div>
      </div>
    </Specimen>
  );
}

/* Forms ---------------------------------------------------------------------------------- */

function FormGroup({ title, description, children }) {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="grid gap-x-8 gap-y-4 px-4 py-5 sm:px-6 lg:grid-cols-[11rem_minmax(0,1fr)]"
    >
      <div>
        <h4 id={id} className="type-h3">
          {title}
        </h4>
        {description && <p className="mt-0.5 type-caption text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function FormSpecimen() {
  const [autoRenew, setAutoRenew] = useState(true);
  return (
    <Specimen
      id="forms"
      title="Forms"
      note="Grouped by what the customer will see; Field wires label, hint, error and aria"
      wide
      className="p-0 sm:p-0"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast.success('Quotation QUO-0418 created', {
            description: 'A review link was emailed to the customer.',
          });
        }}
      >
        <div className="divide-y">
          <FormGroup title="Customer" description="Who is billed, and from when.">
            <Field label="Customer email" required hint="Invoices are sent here.">
              <Input type="email" placeholder="name@company.com" leading={<Mail />} />
            </Field>
            <Field label="Start date">
              <Input type="date" defaultValue="2026-11-01" />
            </Field>
          </FormGroup>

          <FormGroup title="Plan & pricing" description="Prices exclude GST.">
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
            <Field label="Unit price">
              <Input type="number" defaultValue="4999" leading="₹" />
            </Field>
            <Field label="Discount" error="Discounts above 50% need admin approval.">
              <Input type="number" defaultValue="65" trailing="%" />
            </Field>
          </FormGroup>

          <FormGroup title="Options">
            <Field label="Internal note" className="sm:col-span-2">
              <Textarea placeholder="Visible to staff only" />
            </Field>
            <Checkbox
              defaultChecked
              label="Email the quotation"
              description="The customer gets a link to review and confirm."
            />
            <label className="flex cursor-pointer items-start gap-2.5 text-[0.8125rem] leading-5">
              <Switch checked={autoRenew} onCheckedChange={setAutoRenew} className="mt-px" />
              <span>
                <span className="font-medium">Auto-renew</span>
                <span className="block text-muted-foreground">
                  {autoRenew ? 'Renews at the end of each period.' : 'Ends after the first period.'}
                </span>
              </span>
            </label>
          </FormGroup>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t bg-sunken/60 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
          <p className="type-caption text-muted-foreground sm:mr-auto">
            Nothing is billed until the customer confirms.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="tertiary">Cancel</Button>
            <Button variant="secondary">Save as draft</Button>
            <Button type="submit">Create quotation</Button>
          </div>
        </footer>
      </form>
    </Specimen>
  );
}

/* Selection & summary -------------------------------------------------------------------- */

const plans = [
  { key: 'starter', name: 'Starter', note: 'Up to 50 subscriptions', price: 999 },
  { key: 'growth', name: 'Growth', note: 'Unlimited, with dunning', price: 4999, tag: 'Popular' },
  { key: 'enterprise', name: 'Enterprise', note: 'SSO, audit log, SLA', price: 15750 },
];

const GST_RATE = 0.18;

function SelectionSpecimen() {
  const [planKey, setPlanKey] = useState('growth');
  const plan = plans.find((p) => p.key === planKey);
  const gst = Math.round(plan.price * GST_RATE);

  return (
    <Specimen
      id="selection"
      title="Selection & summary"
      note="Choices as ruled rows; the summary reads like the invoice it will become"
      sheet={false}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card>
          <fieldset className="p-4 sm:p-5">
            <legend className="float-left mb-3 w-full type-h3">Choose a plan</legend>
            <div className="clear-both divide-y rounded-md border">
              {plans.map((p) => (
                <label
                  key={p.key}
                  className="flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors duration-75 hover:bg-sunken/60 has-checked:bg-accent-soft/70"
                >
                  <input
                    type="radio"
                    name="plan"
                    value={p.key}
                    checked={planKey === p.key}
                    onChange={() => setPlanKey(p.key)}
                    className="size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-input bg-card transition-[border-width] duration-100 outline-none checked:border-[5px] checked:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[0.8125rem] font-medium">
                      {p.name}
                      {p.tag && <Badge tone="accent">{p.tag}</Badge>}
                    </span>
                    <span className="block type-caption text-muted-foreground">{p.note}</span>
                  </span>
                  <span className="text-right font-mono text-[0.8125rem] tabular-nums">
                    {formatCurrency(p.price)}
                    <span className="block font-sans type-caption text-muted-foreground">
                      / month
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card as="article" aria-label="Next invoice" className="flex flex-col">
          <CardHeader action={<StatusBadge status="draft" />}>
            <CardTitle>Next invoice</CardTitle>
            <CardDescription className="font-mono">INV-2209 · due 12 Nov 2026</CardDescription>
          </CardHeader>
          <dl className="mx-4 mt-4 mb-1 space-y-2 font-mono text-[0.8125rem] tabular-nums sm:mx-5">
            <div className="flex justify-between gap-4">
              <dt className="font-sans text-muted-foreground">{plan.name} plan × 1</dt>
              <dd>{formatCurrency(plan.price)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-sans text-muted-foreground">GST (18%)</dt>
              <dd>{formatCurrency(gst)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t-2 border-rule pt-2.5 pb-3">
              <dt className="font-sans font-semibold">Total</dt>
              <dd className="text-lg font-medium tracking-[-0.03em]">
                {formatCurrency(plan.price + gst)}
              </dd>
            </div>
          </dl>
          <CardFooter className="mt-auto justify-end">
            <Button variant="tertiary" size="sm">
              <Download /> PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={() => toast.success('Preview sent')}>
              <Mail /> Send preview
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Specimen>
  );
}

/* Alerts --------------------------------------------------------------------------------- */

function AlertsSpecimen() {
  return (
    <Specimen
      id="alerts"
      title="Alerts"
      note="Icon, title and text; colour is never the only signal"
    >
      <div className="space-y-2">
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
            <Button size="sm" variant="secondary">
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

/* Tabs ----------------------------------------------------------------------------------- */

function TabsSpecimen() {
  return (
    <Specimen
      id="tabs"
      title="Tabs"
      note="Segmented for view switches, underline for page sections. ← → to move"
    >
      <div className="space-y-8">
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
              Invoices <Badge className="h-4 px-1">4</Badge>
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="pt-4 text-[0.8125rem] text-muted-foreground">
            Plan, billing period and next invoice at a glance.
          </TabsContent>
          <TabsContent value="invoices" className="pt-4 text-[0.8125rem] text-muted-foreground">
            Every invoice raised for this subscription.
          </TabsContent>
          <TabsContent value="activity" className="pt-4 text-[0.8125rem] text-muted-foreground">
            Status changes and who made them.
          </TabsContent>
        </Tabs>
      </div>
    </Specimen>
  );
}

/* Overlays ------------------------------------------------------------------------------- */

function OverlaysSpecimen() {
  const [dialog, setDialog] = useState(null);
  const close = () => setDialog(null);

  return (
    <Specimen
      id="overlays"
      title="Dialogs & toasts"
      note="Dialogs ask before something changes; toasts confirm after"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="type-label text-muted-foreground">Dialogs</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setDialog('pause')}>
              <Pause /> Pause subscription…
            </Button>
            <Button variant="danger-quiet" onClick={() => setDialog('cancel')}>
              Cancel subscription…
            </Button>
          </div>
        </div>
        <div>
          <p className="type-label text-muted-foreground">Toasts</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => toast.success('Invoice INV-2208 sent')}>
              Success
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.error('Payment failed', { description: 'The card ending 4242 was declined.' })
              }
            >
              Error
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast('Subscription paused', {
                  description: 'SUB-1042 will resume on 1 Dec.',
                  action: { label: 'Undo', onClick: () => toast.success('Resumed') },
                })
              }
            >
              With action
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={dialog === 'pause'}
        onClose={close}
        title="Pause SUB-1042?"
        description="Billing stops today. You can resume at any time."
        footer={
          <>
            <Button variant="tertiary" onClick={close}>
              Keep active
            </Button>
            <Button
              onClick={() => {
                close();
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

      <Dialog
        open={dialog === 'cancel'}
        onClose={close}
        title="Cancel SUB-1042?"
        description="Aarav Mehta loses access at the end of the period. This can’t be undone."
        footer={
          <>
            <Button variant="tertiary" onClick={close}>
              Keep subscription
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                close();
                toast('SUB-1042 cancelled', { description: 'The final invoice is INV-2209.' });
              }}
            >
              Cancel subscription
            </Button>
          </>
        }
      >
        <dl className="divide-y rounded-md border font-mono text-[0.8125rem] tabular-nums">
          <div className="flex justify-between px-3 py-2">
            <dt className="font-sans text-muted-foreground">Ends on</dt>
            <dd>11 Nov 2026</dd>
          </div>
          <div className="flex justify-between px-3 py-2">
            <dt className="font-sans text-muted-foreground">Final invoice</dt>
            <dd>₹5,899</dd>
          </div>
        </dl>
      </Dialog>
    </Specimen>
  );
}

/* Data table ----------------------------------------------------------------------------- */

function TableSpecimen() {
  const [selected, setSelected] = useState(() => new Set());
  const allSelected = selected.size === subscriptions.length;
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Specimen
      id="table"
      title="Data table"
      note="Mono, right-aligned figures. Select rows to reveal bulk actions"
      wide
      className="overflow-hidden p-0 sm:p-0"
    >
      <div className="flex min-h-14 flex-col gap-2 border-b px-3 py-2.5 sm:flex-row sm:items-center sm:px-4">
        {selected.size > 0 ? (
          <>
            <p className="font-mono text-xs">{selected.size} selected</p>
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="tertiary" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <Button variant="secondary" size="sm">
                <Pause /> Pause
              </Button>
              <Button variant="danger-quiet" size="sm">
                Close {selected.size}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Input
              leading={<Search />}
              placeholder="Search subscriptions…"
              className="sm:w-72"
              aria-label="Search subscriptions"
            />
            <div className="flex gap-2 sm:ml-auto">
              <Select defaultValue="all" className="flex-1 sm:w-40" aria-label="Status filter">
                <option value="all">All statuses</option>
                {Object.values(SUBSCRIPTION_STATUS).map((s) => (
                  <option key={s} value={s}>
                    {capitalize(s)}
                  </option>
                ))}
              </Select>
              <Button variant="secondary">
                <Download /> Export
              </Button>
            </div>
          </>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 pr-0">
              <Checkbox
                aria-label="Select all"
                checked={allSelected}
                onChange={() =>
                  setSelected(allSelected ? new Set() : new Set(subscriptions.map((s) => s.id)))
                }
              />
            </TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead>Status</TableHead>
            <TableHead numeric>Amount</TableHead>
            <TableHead>Next billing</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((s) => {
            const isSelected = selected.has(s.id);
            return (
              <TableRow
                key={s.id}
                className={cn(isSelected && 'bg-accent-soft/60 hover:bg-accent-soft/80')}
              >
                <TableCell className="pr-0">
                  <Checkbox
                    aria-label={`Select ${s.id}`}
                    checked={isSelected}
                    onChange={() => toggle(s.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.customer} size="sm" />
                    <div className="min-w-0">
                      <p className="font-medium whitespace-nowrap">{s.customer}</p>
                      <p className="truncate type-caption text-muted-foreground">{s.email}</p>
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
                  {formatCurrency(s.amount)}
                  <span className="block font-sans type-caption text-muted-foreground">
                    {s.period}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                  {s.nextBilling}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <footer className="flex items-center justify-between gap-3 border-t px-3 py-2.5 sm:px-4">
        <p className="font-mono text-xs text-muted-foreground">1–5 of 128</p>
        <nav aria-label="Pagination" className="flex gap-1.5">
          <Button variant="secondary" size="sm" disabled>
            <ChevronLeft /> Previous
          </Button>
          <Button variant="secondary" size="sm">
            Next <ChevronRight />
          </Button>
        </nav>
      </footer>
    </Specimen>
  );
}

/* Feedback ------------------------------------------------------------------------------- */

const meters = [
  { label: 'Seats used', value: 42, max: 50, tone: 'warning' },
  { label: 'Collected this month', value: 78, max: 100, tone: 'success' },
  { label: 'Trial elapsed', value: 9, max: 14, tone: 'ink' },
];

function FeedbackSpecimen() {
  return (
    <Specimen id="feedback" title="Feedback" note="Meters, loading and empty states" sheet={false}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Meters & avatars</CardTitle>
          </CardHeader>
          <dl className="space-y-4 p-4 sm:p-5">
            {meters.map(({ label, value, max, tone }) => (
              <div key={label}>
                <div className="mb-1.5 flex justify-between text-[0.8125rem]">
                  <dt>{label}</dt>
                  <dd className="font-mono text-xs text-muted-foreground tabular-nums">
                    {value} / {max}
                  </dd>
                </div>
                <Progress value={value} max={max} tone={tone} label={label} />
              </div>
            ))}
          </dl>
          <CardFooter className="gap-3 bg-transparent">
            <div className="flex -space-x-1.5">
              {subscriptions.map((s) => (
                <Avatar key={s.id} name={s.customer} size="sm" className="ring-2 ring-card" />
              ))}
            </div>
            <span className="type-caption text-muted-foreground">5 customers renew this week</span>
          </CardFooter>
        </Card>

        <Card aria-label="Loading example">
          <CardHeader>
            <CardTitle>Loading</CardTitle>
            <CardDescription>Skeletons mirror the rows they replace.</CardDescription>
          </CardHeader>
          <ul className="mt-3 divide-y border-t" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Skeleton className="size-6" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-2.5 w-1/4" />
                </div>
                <Skeleton className="h-3 w-14" />
              </li>
            ))}
          </ul>
        </Card>

        <EmptyState
          className="lg:col-span-2"
          icon={Inbox}
          title="No invoices yet"
          description="Invoices appear here once a subscription is confirmed and its first billing date arrives."
          action={
            <>
              <Button>
                <Plus /> Create subscription
              </Button>
              <Button variant="tertiary">Import from CSV</Button>
            </>
          }
        />
      </div>
    </Specimen>
  );
}

export function ComponentsSection() {
  return (
    <Section
      id="components"
      number="02"
      title="Components"
      description="Primitives in src/components/ui. Each takes className for layout; variants carry the visual decisions, so screens stay consistent without anyone re-deciding them."
    >
      <ButtonsSpecimen />
      <StatusSpecimen />
      <FormSpecimen />
      <SelectionSpecimen />
      <AlertsSpecimen />
      <TabsSpecimen />
      <OverlaysSpecimen />
      <TableSpecimen />
      <FeedbackSpecimen />
    </Section>
  );
}
