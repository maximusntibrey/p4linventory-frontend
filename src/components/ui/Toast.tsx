import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';
import type { Tone } from './StatusBadge';

export type ToastInput = {
  title: string;
  description?: string;
  tone?: Exclude<Tone, 'brand'>;
  /** Milliseconds before it goes away. 0 keeps it until dismissed. Default 6000. */
  duration?: number;
};

type ToastItem = ToastInput & { id: number };
type Api = { toast: (t: ToastInput) => number; dismiss: (id: number) => void };

const ToastContext = createContext<Api | null>(null);

export function useToast(): Api {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast needs a ToastProvider above it.');
  return api;
}

let nextId = 1;

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { duration = 6000 } = item;
  useEffect(() => {
    if (!duration) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);
  return (
    <li className="flex items-start gap-3 rounded-lg border border-line bg-canvas p-3 shadow-pop">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <StatusBadge tone={item.tone ?? 'neutral'} variant="soft">
          {item.title}
        </StatusBadge>
        {item.description && <p className="m-0 text-sm text-muted">{item.description}</p>}
      </div>
      <Button size="sm" variant="ghost" icon={X} onClick={onDismiss}>
        Dismiss
      </Button>
    </li>
  );
}

/** Mount once near the root. Errors are announced assertively, everything else politely. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const toast = useCallback((t: ToastInput) => {
    const id = nextId++;
    setItems((l) => [...l, { ...t, id }]);
    return id;
  }, []);
  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  const urgent = items.filter((t) => t.tone === 'danger');
  const calm = items.filter((t) => t.tone !== 'danger');
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-(--z-toast) flex flex-col items-center gap-2 px-4 md:inset-x-auto md:right-4 md:bottom-4 md:items-end">
        <div role="alert" aria-label="Errors" className="pointer-events-auto w-full max-w-sm">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {urgent.map((t) => (
              <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
            ))}
          </ul>
        </div>
        <div
          role="status"
          aria-label="Notifications"
          className="pointer-events-auto w-full max-w-sm"
        >
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {calm.map((t) => (
              <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
            ))}
          </ul>
        </div>
      </div>
    </ToastContext.Provider>
  );
}
