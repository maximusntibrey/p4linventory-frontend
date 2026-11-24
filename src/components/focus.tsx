import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

/** Remembers the focused element when the panel opens and gives focus back when it closes. Call it before the panel's own focus effect. */
export function useReturnFocus() {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);
}

/** Success message that takes focus when it appears, so keyboard and screen-reader users land on the result. */
export function SuccessNotice({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <p
      ref={ref}
      tabIndex={-1}
      role="status"
      className="m-0 flex items-center gap-2 font-semibold text-ok"
    >
      <CheckCircle2 aria-hidden="true" size={20} />
      <span>{children}</span>
    </p>
  );
}
