// Shared look for text-like form controls (Input, Select, Textarea).
export const controlBase =
  'w-full rounded-xl border border-input bg-card text-sm text-foreground shadow-xs outline-none ' +
  'transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 ' +
  'hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 ' +
  'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 ' +
  'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/15';
