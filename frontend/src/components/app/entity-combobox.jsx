import { useEffect, useId, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronsUpDown, X } from 'lucide-react';
import { useDebouncedValue } from '@/hooks/use-debounce';
import { controlBase } from '@/components/ui/control-styles';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/**
 * Async search picker (WAI-ARIA combobox + listbox), on the popover surface.
 *
 * fetchOptions(search) → Promise<item[]>; getLabel(item); getDescription?(item).
 * `value` is the selected id; `selected` is the selected item (for its label before the list
 * loads). onChange(id, item) fires on pick, and (null, null) on clear.
 */
export function EntityCombobox({
  value,
  selected,
  onChange,
  fetchOptions,
  queryKey,
  getLabel,
  getDescription,
  getId = (item) => item.id,
  placeholder = 'Search…',
  emptyText = 'No matches',
  clearable = true,
  disabled = false,
  footer,
  className,
  id,
  ...aria
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const [chosen, setPicked] = useState(null);
  const wrapRef = useRef(null);
  const search = useDebouncedValue(text.trim(), 300);

  // The parent's `selected` wins; otherwise the last pick, as long as a value is still set.
  const picked = selected ?? (value && chosen && getId(chosen) === value ? chosen : null);

  const query = useQuery({
    queryKey: ['combobox', ...queryKey, search],
    queryFn: () => fetchOptions(search),
    enabled: open,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const options = query.data ?? [];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const choose = (item) => {
    setPicked(item);
    setText('');
    setOpen(false);
    onChange(getId(item), item);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation(); // don't also close a surrounding dialog
      setOpen(false);
    }
  };

  const shown = open ? text : picked ? getLabel(picked) : '';
  const activeId = open && options[active] ? `${listId}-${active}` : undefined;

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        disabled={disabled}
        placeholder={picked && open ? getLabel(picked) : placeholder}
        value={shown}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={cn(controlBase, 'h-9 px-3', clearable && picked ? 'pr-14' : 'pr-9')}
        {...aria}
      />
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center gap-1 text-muted-foreground">
        {query.isFetching && open && <Spinner label="" className="size-3.5" />}
        <ChevronsUpDown aria-hidden="true" className="size-3.5" />
      </span>
      {clearable && picked && !disabled && (
        <button
          type="button"
          aria-label="Clear selection"
          onClick={() => {
            setPicked(null);
            setText('');
            onChange(null, null);
          }}
          className="absolute top-1/2 right-7 grid size-5 -translate-y-1/2 cursor-pointer place-items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-overlay animate-fade-in">
          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {query.isError && <li className="px-3 py-2 type-caption text-danger-soft-foreground">Couldn't load options.</li>}
            {!query.isError && !query.isPending && options.length === 0 && (
              <li className="px-3 py-2 type-caption text-muted-foreground">{emptyText}</li>
            )}
            {query.isPending && <li className="px-3 py-2 type-caption text-muted-foreground">Loading…</li>}
            {options.map((item, i) => {
              const isSel = value && getId(item) === value;
              return (
                <li
                  key={getId(item)}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSel}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => choose(item)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'cursor-pointer px-3 py-1.5 text-[0.8125rem]',
                    i === active && 'bg-sunken',
                    isSel && 'font-medium',
                  )}
                >
                  <span className="block truncate">{getLabel(item)}</span>
                  {getDescription && (
                    <span className="block truncate type-caption text-muted-foreground">{getDescription(item)}</span>
                  )}
                </li>
              );
            })}
          </ul>
          {footer && <div className="border-t bg-sunken/60 px-2 py-1.5">{footer(() => setOpen(false))}</div>}
        </div>
      )}
    </div>
  );
}
