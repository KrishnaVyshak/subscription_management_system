// Shared look for text-like form controls (Input, Select, Textarea).
// Focus thickens the edge to Cobalt rather than adding a halo, so the field stays the same size.
export const controlBase =
  'w-full rounded-md border border-input bg-card text-[0.8125rem] text-foreground outline-none ' +
  'transition-[border-color,box-shadow] duration-100 placeholder:text-subtle-foreground ' +
  'hover:border-foreground/45 focus-visible:border-accent focus-visible:shadow-[0_0_0_1px_var(--accent)] ' +
  'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted-foreground ' +
  'aria-invalid:border-danger aria-invalid:focus-visible:shadow-[0_0_0_1px_var(--danger)]';
