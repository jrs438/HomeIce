export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="masthead text-2xl">{title.toUpperCase()}</h1>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Landing here soon — built in the next build-order step.
      </p>
    </div>
  );
}
