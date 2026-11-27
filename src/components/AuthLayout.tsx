import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AuthWrapper from 'sections/auth/AuthWrapper';

/** Page for screens shown before the app shell (sign-in, forced password change): the Mantis auth layout in brand colours. */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AuthWrapper>
      <Stack sx={{ gap: 2.5 }}>
        <Typography variant="h3" component="h1">
          {title}
        </Typography>
        {children}
      </Stack>
    </AuthWrapper>
  );
}
