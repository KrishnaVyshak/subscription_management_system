import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

/**
 * Gate for destructive or irreversible actions. `tone="danger"` for anything that destroys or
 * can't be undone; the description should name what changes.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading = false,
  confirmDisabled = false,
  onConfirm,
  children,
}) {
  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="tertiary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
