import { useEffect, useRef, useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useReturnFocus } from '../../components/focus';
import { formatAccra } from '../../lib/time';

type Props = {
  loginId: string;
  password: string;
  expiresAt: string;
  onDone: () => void;
};

/**
 * The one-time password, shown once (C5). Kept only in the caller's component state: it is never put in
 * the query cache, storage or the URL, and it is gone when the screen is left.
 */
export function OneTimePassword({ loginId, password, expiresAt, onDone }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [copy, setCopy] = useState<'ok' | 'failed'>();
  useReturnFocus();
  useEffect(() => heading.current?.focus(), []);

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setCopy('ok');
    } catch {
      setCopy('failed');
    }
  }

  return (
    <Card className="flex flex-col gap-3 border-accent-mid bg-accent-tint">
      <h2 ref={heading} tabIndex={-1} className="text-2xl">
        One-time password
      </h2>
      <p className="m-0 font-semibold">
        This is shown only once. Copy it or write it down now; it cannot be shown again.
      </p>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="font-semibold">Login ID</dt>
        <dd className="m-0 break-all">{loginId}</dd>
        <dt className="font-semibold">Password</dt>
        <dd className="m-0 break-all">
          <code className="text-lg font-semibold">{password}</code>
        </dd>
        <dt className="font-semibold">Valid until</dt>
        <dd className="m-0">{formatAccra(expiresAt)}</dd>
      </dl>
      <p className="m-0 text-sm text-muted">
        The person must choose their own password the first time they sign in.
      </p>
      {copy && (
        <p role="status" className="m-0 font-semibold">
          {copy === 'ok'
            ? 'Password copied.'
            : 'Could not copy. Select the password above and copy it by hand.'}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={Copy} onClick={() => void copyPassword()}>
          Copy password
        </Button>
        <Button onClick={onDone}>I have saved it</Button>
      </div>
    </Card>
  );
}
