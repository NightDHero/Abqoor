import type { CSSProperties } from "react";
import {
  mascotAssets,
  type AbqoorExpression
} from "../../features/tutorial/tutorialConfig";

export function AbqoorGuide({
  className = "",
  expression,
  style
}: {
  className?: string;
  expression: AbqoorExpression;
  style?: CSSProperties;
}) {
  return (
    <figure
      aria-hidden="true"
      className={`abqoor-guide ${className}`.trim()}
      data-expression={expression}
      style={style}
    >
      <span className="abqoor-guide-aura" />
      <img
        alt=""
        draggable={false}
        key={expression}
        src={mascotAssets[expression]}
      />
    </figure>
  );
}
