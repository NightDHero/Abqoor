import type { CareerWorldId } from "../career/career.types";

export function WorldSwitch({
  activeWorld,
  onSwitch
}: {
  activeWorld: CareerWorldId;
  onSwitch: (world: CareerWorldId) => void;
}) {
  return (
    <nav className="learning-world-switch" aria-label="التنقل بين عوالم عبقور">
      <span aria-hidden="true" className="learning-world-switch-orbit" />
      <button
        aria-current={activeWorld === "arabic" ? "page" : undefined}
        className={activeWorld === "arabic" ? "is-active" : ""}
        type="button"
        onClick={() => onSwitch("arabic")}
      >
        <span />
        اللفظي
      </button>
      <button
        aria-current={activeWorld === "math" ? "page" : undefined}
        className={activeWorld === "math" ? "is-active" : ""}
        type="button"
        onClick={() => onSwitch("math")}
      >
        <span />
        الكمي
      </button>
    </nav>
  );
}
