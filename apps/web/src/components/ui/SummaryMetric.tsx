import type { ReactNode } from "react";

export function SummaryMetric({
  detail,
  iconSrc,
  label,
  tone = "default",
  value
}: {
  detail?: string;
  iconSrc?: string;
  label: string;
  tone?: "default" | "positive" | "attention";
  value: ReactNode;
}) {
  return (
    <article className={`summary-metric summary-metric-${tone}`}>
      {iconSrc ? <img alt="" className="summary-metric-icon" src={iconSrc} /> : null}
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}
