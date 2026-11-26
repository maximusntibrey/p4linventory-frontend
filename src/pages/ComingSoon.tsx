/** Stand-in for a screen that a later step builds. The route and its permission check are real. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-display">{title}</h1>
      <p className="text-muted">This screen is not built yet.</p>
    </div>
  );
}
