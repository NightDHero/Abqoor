import { useEffect, useRef, type RefObject } from "react";

export function WorldCursor({
  viewportRef
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
}) {
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const cursor = cursorRef.current;

    if (!viewport || !cursor) {
      return;
    }

    let animationFrame = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let isVisible = false;

    const render = () => {
      currentX += (targetX - currentX) * 0.22;
      currentY += (targetY - currentY) * 0.22;
      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      cursor.dataset.environment =
        viewport.dataset.cursorEnvironment ?? "math";
      cursor.classList.toggle("is-visible", isVisible);
      animationFrame = window.requestAnimationFrame(render);
    };

    const updateTarget = (event: PointerEvent) => {
      const rect = viewport.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;

      if (!isVisible) {
        currentX = targetX;
        currentY = targetY;
      }

      isVisible = true;
    };

    const hideCursor = () => {
      isVisible = false;
    };

    viewport.addEventListener("pointermove", updateTarget);
    viewport.addEventListener("pointerleave", hideCursor);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      viewport.removeEventListener("pointermove", updateTarget);
      viewport.removeEventListener("pointerleave", hideCursor);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [viewportRef]);

  return (
    <span aria-hidden="true" className="math-world-cursor" ref={cursorRef}>
      <i />
      <i />
      <i />
    </span>
  );
}
