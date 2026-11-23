import { Card } from '../components/Card';

export function Home() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-4xl text-ink">Home</h1>
      <Card>
        <h2 className="text-2xl">Welcome</h2>
        <p className="text-muted">
          Sign-in and your tasks will appear here once the app is connected.
        </p>
      </Card>
    </div>
  );
}
