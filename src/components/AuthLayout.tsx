import type { ReactNode } from 'react';
import { Card } from './ui';

/** Plain centred page for screens shown before the app shell (sign-in, forced password change). */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-4">
      <p className="m-0 font-display text-3xl leading-none text-accent">Payless4Laptops</p>
      <Card className="flex flex-col gap-4">
        <h1 className="text-4xl text-ink">{title}</h1>
        {children}
      </Card>
    </main>
  );
}
