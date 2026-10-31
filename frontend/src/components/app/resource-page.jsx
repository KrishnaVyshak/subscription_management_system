import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useApiMutation, useList } from '@/api/factory';
import { useCanEdit } from '@/auth/context';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useListParams } from '@/hooks/use-list-params';
import { api } from '@/lib/api';
import { fieldErrors, notifyError } from '@/lib/errors';
import { ConfirmDialog } from './confirm-dialog';
import { DataTable } from './data-table';
import { FilterBar, FilterSpacer, SearchInput, SelectFilter } from './filter-bar';
import { Page, PageHeader } from './page-header';
import { EmptyState } from './states';

/** One field of the generic form. */
function FormField({ field, values, set, error }) {
  const v = values[field.name];
  const common = { label: field.label, hint: field.hint, error, required: field.required };
  const multi = useQuery({
    queryKey: ['opts', field.optionsUrl],
    queryFn: () => api.get(field.optionsUrl, { pageSize: 100 }).then((r) => r.data),
    enabled: field.type === 'multi',
  });
  if (field.type === 'switch')
    return (
      <div className="flex items-center gap-2.5 text-[0.8125rem]">
        <Switch checked={Boolean(v)} onCheckedChange={(x) => set(field.name, x)} id={`f-${field.name}`} />
        <label htmlFor={`f-${field.name}`} className="font-medium">
          {field.label}
        </label>
      </div>
    );
  if (field.type === 'multi')
    return (
      <Field {...common}>
        <div className="flex flex-col gap-1.5 rounded-md border p-2">
          {(multi.data ?? []).map((o) => (
            <Checkbox
              key={o.id}
              label={field.optionLabel ? field.optionLabel(o) : o.name}
              checked={(v ?? []).includes(o.id)}
              onChange={(e) => set(field.name, e.target.checked ? [...(v ?? []), o.id] : (v ?? []).filter((x) => x !== o.id))}
            />
          ))}
          {!multi.data?.length && <span className="type-caption text-muted-foreground">None available</span>}
        </div>
      </Field>
    );
  if (field.type === 'custom') return <Field {...common}><div>{field.render(v, (x) => set(field.name, x), values)}</div></Field>;
  if (field.type === 'select')
    return (
      <Field {...common}>
        <Select value={v ?? ''} onChange={(e) => set(field.name, e.target.value)}>
          {field.placeholder !== undefined && <option value="">{field.placeholder}</option>}
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  if (field.type === 'textarea')
    return (
      <Field {...common}>
        <Textarea value={v ?? ''} onChange={(e) => set(field.name, e.target.value)} />
      </Field>
    );
  return (
    <Field {...common}>
      <Input
        type={field.type ?? 'text'}
        step={field.step}
        min={field.min}
        value={v ?? ''}
        onChange={(e) => set(field.name, e.target.value)}
      />
    </Field>
  );
}

/**
 * A modal create/edit form from a field list. fields: [{ name, label, type, options, required,
 * hint, optionsUrl, createOnly }]. `toPayload(values, editing)` shapes the body.
 */
export function RecordDialog({ open, onClose, title, fields, initial, url, createUrl, editing, toPayload, invalidate, entity = 'Record', wide }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (open) {
      setValues(initial);
      setErrors({});
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useApiMutation({
    mutationFn: (body) => (editing ? api.patch(`${url}/${editing.id}`, body) : api.post(createUrl ?? url, body)),
    invalidate,
    success: editing ? `${entity} saved` : `${entity} created`,
    manualError: true,
    onSuccess: () => onClose(),
  });
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    save.mutate(toPayload ? toPayload(values, editing) : values, {
      onError: (err) => {
        const fe = fieldErrors(err);
        if (Object.keys(fe).length) setErrors(fe);
        else notifyError(err);
      },
    });
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      className={wide ? 'max-w-2xl' : undefined}
      footer={
        <>
          <Button variant="tertiary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="record-form" loading={save.isPending}>
            Save
          </Button>
        </>
      }
    >
      <form id="record-form" onSubmit={submit} className="grid gap-4">
        {fields
          .filter((f) => !(f.createOnly && editing) && !(f.editOnly && !editing))
          .map((f) => (
            <FormField key={f.name} field={f} values={values ?? {}} set={set} error={errors[f.name]} />
          ))}
      </form>
    </Dialog>
  );
}

/**
 * List page + create/edit dialog for a simple resource.
 * Props: title, description, url, qk (query key), columns, fields, blank (initial values),
 * toInitial(row), toPayload, filters [{ name, label, options }], sorts, canWrite (default admin),
 * deletable, createLabel, includeInactive, search.
 */
export function ResourcePage({
  title,
  description,
  url,
  qk,
  columns,
  fields,
  blank = {},
  toInitial = (r) => r,
  toPayload,
  filters = [],
  defaultSort,
  canWrite,
  deletable = false,
  createLabel = 'New',
  entity = 'Record',
  includeInactive = false,
  searchable = true,
  extraActions,
  wide,
  onRowClick,
  rowActions,
  createUrl,
}) {
  const admin = useCanEdit();
  const writable = canWrite ?? admin;
  const { params, set, page, pageSize, sort } = useListParams({ sort: defaultSort ?? '' });
  const [dialog, setDialog] = useState(null); // null | { row? }
  const [removing, setRemoving] = useState(null);
  const query = useList(qk, url, {
    page,
    pageSize,
    sort: sort || undefined,
    search: params.search,
    includeInactive: includeInactive ? true : undefined,
    ...Object.fromEntries(filters.map((f) => [f.name, params[f.name]])),
  });
  const del = useApiMutation({
    mutationFn: (id) => api.delete(`${url}/${id}`),
    invalidate: [[qk]],
    success: `${entity} removed`,
    onSuccess: () => setRemoving(null),
  });

  const cols = [
    ...columns,
    ...(writable || rowActions
      ? [
          {
            id: 'actions',
            header: '',
            mobile: false,
            className: 'text-right',
            cell: (row) => (
              <span className="flex justify-end gap-1.5">
                {rowActions?.(row)}
                {writable && (
                  <Button size="sm" variant="secondary" onClick={() => setDialog({ row })}>
                    Edit
                  </Button>
                )}
                {writable && deletable && row.isActive !== false && (
                  <Button size="sm" variant="danger-quiet" onClick={() => setRemoving(row)}>
                    Remove
                  </Button>
                )}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <Page>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {extraActions}
            {writable && (
              <Button onClick={() => setDialog({})}>
                <Plus /> {createLabel}
              </Button>
            )}
          </>
        }
      />
      <DataTable
        label={title}
        columns={cols}
        query={query}
        sort={sort}
        onSortChange={(s) => set({ sort: s }, { resetPage: false })}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => set({ page: p }, { resetPage: false })}
        onRowClick={onRowClick}
        toolbar={
          (searchable || filters.length > 0) && (
            <FilterBar>
              {searchable && <SearchInput value={params.search ?? ''} onChange={(v) => set({ search: v })} />}
              <FilterSpacer />
              {filters.map((f) => (
                <SelectFilter
                  key={f.name}
                  label={f.label}
                  value={params[f.name] ?? ''}
                  options={f.options}
                  onChange={(v) => set({ [f.name]: v })}
                />
              ))}
            </FilterBar>
          )
        }
        empty={<EmptyState title={`No ${title.toLowerCase()} yet`} />}
      />
      <RecordDialog
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        title={dialog?.row ? `Edit ${entity.toLowerCase()}` : `New ${entity.toLowerCase()}`}
        fields={fields}
        initial={dialog?.row ? toInitial(dialog.row) : blank}
        url={url}
        createUrl={createUrl}
        editing={dialog?.row}
        toPayload={toPayload}
        invalidate={[[qk], ['combobox']]}
        entity={entity}
        wide={wide}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={`Remove ${entity.toLowerCase()}?`}
        description="It will be hidden from new documents. Existing records keep their data."
        tone="danger"
        confirmLabel="Remove"
        loading={del.isPending}
        onConfirm={() => del.mutate(removing.id)}
      />
    </Page>
  );
}
