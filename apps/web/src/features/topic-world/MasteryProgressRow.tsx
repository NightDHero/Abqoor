import type { CSSProperties, ReactNode } from "react";

export function MasteryProgressRow({
  animationIndex,
  icon,
  masteryPercent,
  name,
  onActivate,
  variant
}: {
  animationIndex: number;
  icon?: ReactNode;
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
          "--row-delay": `${Math.min(animationIndex * 45, 360)}ms`
        } as CSSProperties
      }
      type="button"
      onClick={onActivate}
    >
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
