import type { ReactNode } from "react";

export function SummaryMetric({
  detail,
  label,
  tone = "default",
  value
}: {
  detail?: string;
  label: string;
  tone?: "default" | "positive" | "attention";
  value: ReactNode;
}) {
  return (
    <article className={`summary-metric summary-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}
