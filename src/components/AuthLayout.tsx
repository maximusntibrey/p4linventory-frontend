import type { ReactNode } from 'react';
import { Card, Logo } from './ui';

/** Centred page for screens shown before the app shell (sign-in, forced password change). */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-4">
      <Logo />
      <Card className="flex flex-col gap-4">
        <h1 className="text-display">{title}</h1>
        {children}
      </Card>
    </main>
  );
}
