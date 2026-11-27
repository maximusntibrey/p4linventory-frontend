import { useId } from 'react';
import { Button } from './Button';
import { Overlay } from './Overlay';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` styles the confirm button as destructive. */
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Asks before an irreversible action. The safe choice (cancel) takes focus first. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const descId = useId();
  return (
    <Overlay
      open={open}
      onClose={onCancel}
      title={title}
      placement="center"
      alert
      describedBy={descId}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} data-autofocus>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p id={descId} className="m-0">
        {description}
      </p>
    </Overlay>
  );
}
