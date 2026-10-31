import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DATE_PRESETS, matchPreset, presetRange } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

/** The toolbar strip above a table: search on the left, filters to the right. */
export function FilterBar({ children, className }) {
  return (
    <div className={cn('flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center', className)}>
      {children}
    </div>
  );
}

/** Pushes the following filters to the right edge on wide screens. */
export function FilterSpacer() {
  return <span aria-hidden="true" className="hidden sm:ml-auto sm:block" />;
}

/** Search that reports its value 300 ms after typing stops. */
export function SearchInput({ value = '', onChange, placeholder = 'Search…', label, className }) {
  const [text, setText] = useState(value);
  const last = useRef(value);

  // Follow external changes (back button, a cleared filter).
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === (last.current ?? '')) return undefined;
    const t = setTimeout(() => {
      last.current = trimmed;
      onChange(trimmed);
    }, 300);
    return () => clearTimeout(t);
  }, [text, onChange]);

  return (
    <div className={cn('relative sm:w-72', className)}>
      <Input
        type="search"
        leading={<Search />}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="[&_input]:pr-8"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setText('')}
          className="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 cursor-pointer place-items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Status tabs with counts. options: [{ value, label, count? }]. `value` '' = All.
 * Scrolls sideways on narrow screens rather than wrapping.
 */
export function StatusTabs({ options, value = '', onChange, label = 'Status' }) {
  return (
    <div className="-mx-1 max-w-full overflow-x-auto px-1">
      <Tabs value={value} onValueChange={onChange}>
        <TabsList aria-label={label}>
          {options.map((o) => (
            <TabsTrigger key={o.value || 'all'} value={o.value}>
              {o.label}
              {o.count !== undefined && (
                <span className="font-mono text-[0.6875rem] text-subtle-foreground tabular-nums">
                  {formatNumber(o.count)}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

/**
 * Date range: presets (this month, last month, this quarter) or a custom from/to.
 * onChange({ from, to }); both '' means any date.
 */
export function DateRangeFilter({ from = '', to = '', onChange, label = 'Date', anyLabel = 'Any date' }) {
  const preset = matchPreset(from, to);
  const [custom, setCustom] = useState(preset === 'custom');
  const showCustom = custom || preset === 'custom';
  const id = `range-${label.replace(/\W+/g, '-').toLowerCase()}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label={`${label} range`}
        value={showCustom ? 'custom' : preset}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'custom') {
            setCustom(true);
            return;
          }
          setCustom(false);
          onChange(v ? presetRange(v) : { from: '', to: '' });
        }}
        className="w-full sm:w-40"
      >
        <option value="">
          {label}: {anyLabel.toLowerCase()}
        </option>
        {DATE_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {label}: {p.label.toLowerCase()}
          </option>
        ))}
      </Select>
      {showCustom && (
        <span className="flex items-center gap-1.5">
          <Input
            type="date"
            id={`${id}-from`}
            aria-label={`${label} from`}
            value={from}
            max={to || undefined}
            onChange={(e) => onChange({ from: e.target.value, to })}
            className="w-36"
          />
          <span aria-hidden="true" className="text-subtle-foreground">
            –
          </span>
          <Input
            type="date"
            id={`${id}-to`}
            aria-label={`${label} to`}
            value={to}
            min={from || undefined}
            onChange={(e) => onChange({ from, to: e.target.value })}
            className="w-36"
          />
        </span>
      )}
    </div>
  );
}

/** A labelled native select for small enumerations (type, method, role). */
export function SelectFilter({ value = '', onChange, options, label, allLabel = 'All', className }) {
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn('w-full sm:w-44', className)}
    >
      <option value="">
        {label}: {allLabel.toLowerCase()}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {label}: {o.label}
        </option>
      ))}
    </Select>
  );
}
