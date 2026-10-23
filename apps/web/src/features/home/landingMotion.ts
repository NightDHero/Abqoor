export function attachLandingPointer(page: HTMLElement, spotlight: HTMLElement) {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let animationFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

  const hidePointer = () => {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    spotlight.dataset.visible = "false";
  };
  const renderPointer = () => {
    spotlight.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
    spotlight.dataset.visible = "true";
    animationFrame = 0;
  };
  const handlePointerMove = (event: PointerEvent) => {
    if (!finePointer.matches || reducedMotion.matches || event.pointerType === "touch") {
      hidePointer();
      return;
    }
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!animationFrame) animationFrame = window.requestAnimationFrame(renderPointer);
  };

  page.addEventListener("pointermove", handlePointerMove, { passive: true });
  page.addEventListener("pointerleave", hidePointer);
  page.addEventListener("pointercancel", hidePointer);
  window.addEventListener("blur", hidePointer);
  document.addEventListener("visibilitychange", hidePointer);
  finePointer.addEventListener("change", hidePointer);
  reducedMotion.addEventListener("change", hidePointer);

  return () => {
    hidePointer();
    page.removeEventListener("pointermove", handlePointerMove);
    page.removeEventListener("pointerleave", hidePointer);
    page.removeEventListener("pointercancel", hidePointer);
    window.removeEventListener("blur", hidePointer);
    document.removeEventListener("visibilitychange", hidePointer);
    finePointer.removeEventListener("change", hidePointer);
    reducedMotion.removeEventListener("change", hidePointer);
  };
}
