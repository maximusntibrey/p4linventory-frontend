import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import { Copy } from 'components/icons';
import { useReturnFocus } from '../../components/focus';
import { formatAccra } from '../../lib/time';
import { Button, Card } from '../../components/ui';

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
    <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: 'primary.lighter' }}>
      <Box component="h2" ref={heading} tabIndex={-1} sx={{ fontSize: '1.5rem' }}>
        One-time password
      </Box>
      <Box component="p" sx={{ m: 0, fontWeight: 600 }}>
        This is shown only once. Copy it or write it down now; it cannot be shown again.
      </Box>
      <Box component="dl" sx={{ m: 0, display: 'grid', columnGap: 1.5, rowGap: 0.5 }}>
        <Box component="dt" sx={{ fontWeight: 600 }}>
          Login ID
        </Box>
        <Box component="dd" sx={{ m: 0, wordBreak: 'break-all' }}>
          {loginId}
        </Box>
        <Box component="dt" sx={{ fontWeight: 600 }}>
          Password
        </Box>
        <Box component="dd" sx={{ m: 0, wordBreak: 'break-all' }}>
          <Box component="code" sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
            {password}
          </Box>
        </Box>
        <Box component="dt" sx={{ fontWeight: 600 }}>
          Valid until
        </Box>
        <Box component="dd" sx={{ m: 0 }}>
          {formatAccra(expiresAt)}
        </Box>
      </Box>
      <Box component="p" sx={{ m: 0, fontSize: '0.875rem', color: 'text.secondary' }}>
        The person must choose their own password the first time they sign in.
      </Box>
      {copy && (
        <Box component="p" role="status" sx={{ m: 0, fontWeight: 600 }}>
          {copy === 'ok'
            ? 'Password copied.'
            : 'Could not copy. Select the password above and copy it by hand.'}
        </Box>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button variant="secondary" icon={Copy} onClick={() => void copyPassword()}>
          Copy password
        </Button>
        <Button onClick={onDone}>I have saved it</Button>
      </Box>
    </Card>
  );
}
