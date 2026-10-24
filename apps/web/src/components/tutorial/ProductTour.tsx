import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties
} from "react";
import {
  productTourSteps,
  tutorialReplayEvent
} from "../../features/tutorial/tutorialConfig";
import { calculateTourPanelPosition } from "../../features/tutorial/tourPosition";
import { tutorialService } from "../../services/tutorialService";
import { navigateTo } from "../../utils/router";
import { AbqoorGuide } from "./AbqoorGuide";
import "./product-tour.css";

type TargetFrame = {
  borderRadius: string;
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

const toArabicNumber = (value: number) => value.toLocaleString("ar-SA");

export function ProductTour({
  currentPath,
  userId
}: {
  currentPath: string;
  userId: string;
}) {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetFrame, setTargetFrame] = useState<TargetFrame | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [persistenceWarning, setPersistenceWarning] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const step = productTourSteps[currentStep];

  const persist = useCallback((status: "in_progress" | "dismissed" | "completed", stepIndex: number) => {
    void tutorialService.saveProgress(status, stepIndex)
      .then(() => setPersistenceWarning(false))
      .catch(() => setPersistenceWarning(true));
  }, []);

  const begin = useCallback((stepIndex = 0) => {
    const safeStep = clamp(stepIndex, 0, productTourSteps.length - 1);
    setCurrentStep(safeStep);
    setActive(true);
    setTargetMissing(false);
    persist("in_progress", safeStep);
  }, [persist]);

  useEffect(() => {
    let mounted = true;
    let timer = 0;

    void tutorialService.getProgress()
      .then(({ tutorial }) => {
        if (!mounted) return;
        if (tutorial.status === "not_started" || tutorial.status === "in_progress") {
          timer = window.setTimeout(
            () => begin(tutorial.status === "in_progress" ? tutorial.currentStep : 0),
            650
          );
        }
      })
      .catch(() => {
        // A failed preference read must never block the signed-in application.
      });

    const replay = () => begin(0);
    window.addEventListener(tutorialReplayEvent, replay);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
      window.removeEventListener(tutorialReplayEvent, replay);
    };
  }, [begin, userId]);

  useLayoutEffect(() => {
    if (!active) return;
    dialogRef.current?.focus({ preventScroll: true });
  }, [active, currentStep]);

  useEffect(() => {
    if (!active) return;

    if (currentPath !== step.route) {
      setTargetFrame(null);
      setTargetMissing(false);
      navigateTo(step.route);
      return;
    }

    let target: HTMLElement | null = null;
    let mutationObserver: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let missingTimer = 0;
    let frame = 0;

    const updateTargetFrame = () => {
      if (!target) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!target) return;
        const bounds = target.getBoundingClientRect();
        const computed = window.getComputedStyle(target);
        setTargetFrame({
          borderRadius: computed.borderRadius || "24px",
          bottom: bounds.bottom,
          height: bounds.height,
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
          width: bounds.width
        });
      });
    };

    const attachTarget = () => {
      const match = document.querySelector<HTMLElement>(step.targetSelector);
      if (!match || match.offsetParent === null) return false;
      target = match;
      target.dataset.abqoorTourTarget = "true";
      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
        inline: "nearest"
      });
      setTargetMissing(false);
      updateTargetFrame();
      resizeObserver = new ResizeObserver(updateTargetFrame);
      resizeObserver.observe(target);
      window.addEventListener("resize", updateTargetFrame);
      window.addEventListener("scroll", updateTargetFrame, true);
      return true;
    };

    if (!attachTarget()) {
      mutationObserver = new MutationObserver(() => {
        if (attachTarget()) mutationObserver?.disconnect();
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
      missingTimer = window.setTimeout(() => setTargetMissing(true), 3500);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(missingTimer);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateTargetFrame);
      window.removeEventListener("scroll", updateTargetFrame, true);
      if (target) delete target.dataset.abqoorTourTarget;
    };
  }, [active, currentPath, step]);

  const dismiss = useCallback(() => {
    persist("dismissed", currentStep);
    setActive(false);
    setTargetFrame(null);
  }, [currentStep, persist]);

  const complete = useCallback(() => {
    persist("completed", productTourSteps.length - 1);
    setActive(false);
    setTargetFrame(null);
  }, [persist]);

  const goToStep = useCallback((nextStep: number) => {
    const safeStep = clamp(nextStep, 0, productTourSteps.length - 1);
    setCurrentStep(safeStep);
    setTargetFrame(null);
    setTargetMissing(false);
    persist("in_progress", safeStep);
  }, [persist]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
      if (event.key === "ArrowRight" && currentStep > 0) {
        event.preventDefault();
        goToStep(currentStep - 1);
      }
      if (event.key === "ArrowLeft" && currentStep < productTourSteps.length - 1) {
        event.preventDefault();
        goToStep(currentStep + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, currentStep, dismiss, goToStep]);

  if (!active) return null;

  const panelPosition = calculateTourPanelPosition(
    targetFrame,
    window.innerWidth,
    window.innerHeight
  );
  const spotlightStyle = targetFrame ? {
    borderRadius: targetFrame.borderRadius,
    height: `${Math.min(targetFrame.height + 20, window.innerHeight - 16)}px`,
    left: `${clamp(targetFrame.left - 10, 8, window.innerWidth - 8)}px`,
    top: `${clamp(targetFrame.top - 10, 8, window.innerHeight - 8)}px`,
    width: `${Math.min(targetFrame.width + 20, window.innerWidth - 16)}px`
  } : undefined;
  const panelStyle = {
    left: `${panelPosition.left}px`,
    top: `${panelPosition.top}px`,
    width: `${panelPosition.width}px`
  } as CSSProperties;
  const isLastStep = currentStep === productTourSteps.length - 1;

  return (
    <div className="product-tour" dir="rtl">
      <div className="product-tour-backdrop" aria-hidden="true" />
      {targetFrame ? (
        <div
          aria-hidden="true"
          className="product-tour-spotlight"
          style={spotlightStyle}
        />
      ) : null}
      <section
        aria-describedby="product-tour-message"
        aria-labelledby="product-tour-title"
        aria-modal="false"
        className="product-tour-panel"
        ref={dialogRef}
        role="dialog"
        style={panelStyle}
        tabIndex={-1}
      >
        <AbqoorGuide expression={step.expression} />
        <div className="product-tour-dialogue">
          <header>
            <span>{toArabicNumber(currentStep + 1)} من {toArabicNumber(productTourSteps.length)}</span>
            <button type="button" onClick={dismiss}>تخطي الجولة</button>
          </header>
          <strong id="product-tour-title">{step.title}</strong>
          <p id="product-tour-message">{step.message}</p>
          {targetMissing ? (
            <small>تعذر إظهار {step.targetLabel} الآن، وتقدر تكمل الجولة بشكل طبيعي.</small>
          ) : null}
          {persistenceWarning ? (
            <small>تعذر حفظ موضع الجولة مؤقتاً. تقدر تكمل بدون ما يتوقف الموقع.</small>
          ) : null}
          <div className="product-tour-progress" aria-hidden="true">
            {productTourSteps.map((tourStep, index) => (
              <i data-active={index <= currentStep} key={tourStep.id} />
            ))}
          </div>
          <div className="product-tour-actions">
            <button
              className="product-tour-previous"
              disabled={currentStep === 0}
              type="button"
              onClick={() => goToStep(currentStep - 1)}
            >
              السابق
            </button>
            <button
              className="product-tour-next"
              type="button"
              onClick={() => isLastStep ? complete() : goToStep(currentStep + 1)}
            >
              {isLastStep ? "إنهاء الجولة" : "التالي"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
