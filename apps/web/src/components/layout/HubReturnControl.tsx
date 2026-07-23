import { navigateTo } from "../../utils/router";

export function HubReturnControl() {
  return (
    <button
      aria-label="العودة إلى المركز"
      className="hub-return-control"
      title="العودة إلى المركز"
      type="button"
      onClick={() => navigateTo("/career")}
    >
      <img alt="" src="/assets/topic-world/home.png" />
    </button>
  );
}
