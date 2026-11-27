import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { cx } from './cx';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export type OverlayProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** `center` = Modal, `right` = Drawer. */
  placement: 'center' | 'right';
  children: ReactNode;
  footer?: ReactNode;
  /** Set for ConfirmDialog: role="alertdialog". */
  alert?: boolean;
  describedBy?: string;
  /** Phones: fill the screen instead of a bottom sheet (command palette, profile). Wider screens are unchanged. */
  fullOnPhone?: boolean;
};

/** Shared engine for Modal, Drawer and ConfirmDialog: focus trap, Escape, scroll lock, focus return. */
export function Overlay({
  open,
  onClose,
  title,
  placement,
  children,
  footer,
  alert,
  describedBy,
  fullOnPhone,
}: OverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = ref.current;
    (panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel)?.focus();
    return () => {
      document.body.style.overflow = previous;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return e.preventDefault();
    const first = items[0];
    const last = items[items.length - 1];
    if (
      e.shiftKey &&
      (document.activeElement === first || document.activeElement === ref.current)
    ) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    // Scrim click is a pointer shortcut only: keyboard users have Escape and the Close button.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={cx(
        'fixed inset-0 z-(--z-modal) flex bg-scrim',
        placement === 'center' ? 'items-end justify-center sm:items-center sm:p-4' : 'justify-end',
      )}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cx(
          'flex max-h-full w-full flex-col gap-4 overflow-y-auto bg-canvas p-4 shadow-float',
          placement === 'center'
            ? cx('sm:max-w-lg sm:rounded-xl', fullOnPhone ? 'h-full sm:h-auto' : 'rounded-t-xl')
            : 'h-full max-w-md border-l border-line',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id={titleId} className="text-title">
            {title}
          </h2>
          <Button variant="ghost" icon={X} onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex-1">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
