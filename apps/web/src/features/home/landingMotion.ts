export function attachLandingPointer(page: HTMLElement, spotlight: HTMLElement) {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let animationFrame = 0;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let hasPosition = false;

  const hidePointer = () => {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    hasPosition = false;
    spotlight.dataset.visible = "false";
  };
  const renderPointer = () => {
    const distanceX = targetX - currentX;
    const distanceY = targetY - currentY;
    currentX += distanceX * 0.2;
    currentY += distanceY * 0.2;
    spotlight.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
    spotlight.dataset.visible = "true";
    animationFrame = 0;
    if (Math.abs(distanceX) > 0.25 || Math.abs(distanceY) > 0.25) {
      animationFrame = window.requestAnimationFrame(renderPointer);
    } else {
      currentX = targetX;
      currentY = targetY;
      spotlight.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
    }
  };
  const handlePointerMove = (event: PointerEvent) => {
    if (!finePointer.matches || reducedMotion.matches || event.pointerType === "touch") {
      hidePointer();
      return;
    }
    targetX = event.clientX;
    targetY = event.clientY;
    if (!hasPosition) {
      currentX = targetX;
      currentY = targetY;
      hasPosition = true;
    }
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
