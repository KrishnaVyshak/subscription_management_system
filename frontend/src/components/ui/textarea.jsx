import { cn } from '@/lib/utils';
import { controlBase } from './control-styles';

export function Textarea({ className, rows = 3, ...props }) {
  return (
    <textarea rows={rows} className={cn(controlBase, 'px-3.5 py-2.5', className)} {...props} />
  );
}
