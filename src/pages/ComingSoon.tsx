/** Stand-in for a screen that a later step builds. The route and its permission check are real. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-4xl text-ink">{title}</h1>
      <p className="text-muted">This screen is not built yet.</p>
    </div>
  );
}
