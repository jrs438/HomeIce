import { Car } from "lucide-react";

export function DriverPuck({
  name,
  color,
  external,
}: {
  name: string;
  color?: string;
  external?: boolean;
}) {
  const borderColor = external ? "var(--person-external)" : color ?? "var(--text)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        borderWidth: external ? 1.5 : 1.5,
        borderColor,
        background: external ? "transparent" : "var(--bg-panel)",
        color: external ? "var(--text)" : color,
      }}
    >
      <Car size={13} style={{ color: borderColor }} />
      {name}
    </span>
  );
}

export function PersonChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ background: color }}
    >
      {name}
    </span>
  );
}
