import type { CSSProperties, ReactNode } from "react";

export function MasteryProgressRow({
  icon,
  index,
  masteryPercent,
  name,
  onActivate,
  variant
}: {
  icon?: ReactNode;
  index: number;
  masteryPercent: number;
  name: string;
  onActivate: () => void;
  variant: "topic" | "subtopic";
}) {
  return (
    <button
      className={`mastery-progress-row mastery-progress-row-${variant}`}
      style={
        {
          "--mastery-progress": `${masteryPercent}%`,
          "--row-delay": `${Math.min(index * 45, 360)}ms`
        } as CSSProperties
      }
      type="button"
      onClick={onActivate}
    >
      <span className="mastery-progress-index" aria-hidden="true">
        {String(index).padStart(2, "0")}
      </span>
      {icon ? <span className="mastery-progress-icon">{icon}</span> : null}
      <span className="mastery-progress-content">
        <span className="mastery-progress-heading">
          <strong>{name}</strong>
          <b>{masteryPercent}%</b>
        </span>
        <span
          aria-label={`نسبة الإتقان ${masteryPercent}%`}
          className="mastery-progress-track"
          role="progressbar"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={masteryPercent}
        >
          <span className="mastery-progress-fill" />
        </span>
      </span>
      <span className="mastery-progress-arrow" aria-hidden="true">
        ←
      </span>
    </button>
  );
}
