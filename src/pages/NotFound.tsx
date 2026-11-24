import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-4">
      <h1 className="text-4xl">Page not found</h1>
      <p className="text-muted">We could not find that page. Check the address or go back home.</p>
      <Link
        to="/"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 font-semibold text-white no-underline hover:bg-accent-hover"
      >
        <Home aria-hidden="true" size={20} />
        <span>Back to Home</span>
      </Link>
    </div>
  );
}
