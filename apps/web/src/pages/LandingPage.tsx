import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  FloatingQuestionField,
  HomeAdaptiveShowcase,
  HomeAdviceUnlockVisual,
  HomeBrowserShowcase,
  HomeMockExamShowcase
} from "../features/home/HomeProductVisuals";
import { homeContent } from "../features/home/homeContent";
import { attachLandingPointer } from "../features/home/landingMotion";
import { LandingCinematicHero } from "../features/home/LandingCinematicHero";
import {
  recognitionQuestionPlacements,
  transitionQuestionPlacements
} from "../features/home/homeQuestionData";
import type { User } from "../types/auth";
import { navigateTo } from "../utils/router";

type HomeSectionId = (typeof homeContent.navSections)[number]["id"];

export const getLandingScrollDuration = (distance: number) =>
  Math.min(820, Math.max(520, Math.abs(distance) * 0.16));

export const getLandingScrollProgress = (progress: number) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  return clampedProgress < 0.5
    ? 4 * clampedProgress ** 3
    : 1 - ((-2 * clampedProgress + 2) ** 3) / 2;
};

export const getLandingProgramDestination = (user: User | null) => user
  ? user.mustChangePassword
    ? "/change-password"
    : user.profileCompleted
      ? "/career"
      : "/setup-profile"
  : "/register";

export function LandingPage({ user: _user }: { user: User | null }) {
  const pageRef = useRef<HTMLElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const navigationHeightRef = useRef(64);
  const pointerSpotlightRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const closingRef = useRef<HTMLElement>(null);
  const sectionScrollFrameRef = useRef<number | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<HomeSectionId>(
    homeContent.navSections[0].id
  );

  useEffect(() => {
    const page = pageRef.current;
    if (!page) {
      return;
    }

    const revealItems = page.querySelectorAll<HTMLElement>("[data-reveal]");
    const sections = page.querySelectorAll<HTMLElement>(".home-section");
    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target.classList.contains("home-section")) {
            (entry.target as HTMLElement).dataset.inView = String(entry.isIntersecting);
          } else if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -5%",
        threshold: 0
      }
    );

    revealItems.forEach((item) => observer.observe(item));
    sections.forEach((section) => {
      section.dataset.inView = "false";
      observer.observe(section);
    });
    page.querySelector<HTMLElement>(".home-hero-mark")?.classList.add("is-visible");
    page.querySelector<HTMLElement>(".home-hero-copy")?.classList.add("is-visible");
    page.dataset.motionReady = "true";

    return () => {
      observer.disconnect();
      sections.forEach((section) => delete section.dataset.inView);
      delete page.dataset.motionReady;
    };
  }, []);

  useEffect(() => {
    const closing = closingRef.current;
    if (!closing) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let animationFrame = 0;
    let currentX = 50;
    let currentY = 50;
    let targetX = 50;
    let targetY = 50;

    const applyGlowPosition = () => {
      closing.style.setProperty("--home-closing-glow-x", `${currentX}%`);
      closing.style.setProperty("--home-closing-glow-y", `${currentY}%`);
    };

    const animateGlow = () => {
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;
      applyGlowPosition();

      if (Math.abs(targetX - currentX) > 0.04 || Math.abs(targetY - currentY) > 0.04) {
        animationFrame = window.requestAnimationFrame(animateGlow);
      } else {
        currentX = targetX;
        currentY = targetY;
        applyGlowPosition();
        animationFrame = 0;
      }
    };

    const scheduleGlow = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(animateGlow);
    };

    const centerGlow = () => {
      targetX = 50;
      targetY = 50;
      if (reducedMotion.matches || !finePointer.matches) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        currentX = targetX;
        currentY = targetY;
        applyGlowPosition();
        return;
      }
      scheduleGlow();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion.matches || !finePointer.matches) return;
      const bounds = closing.getBoundingClientRect();
      targetX = Math.min(76, Math.max(24, ((event.clientX - bounds.left) / bounds.width) * 100));
      targetY = Math.min(72, Math.max(28, ((event.clientY - bounds.top) / bounds.height) * 100));
      scheduleGlow();
    };

    closing.addEventListener("pointermove", handlePointerMove, { passive: true });
    closing.addEventListener("pointerleave", centerGlow);
    reducedMotion.addEventListener("change", centerGlow);
    finePointer.addEventListener("change", centerGlow);

    return () => {
      cancelAnimationFrame(animationFrame);
      closing.removeEventListener("pointermove", handlePointerMove);
      closing.removeEventListener("pointerleave", centerGlow);
      reducedMotion.removeEventListener("change", centerGlow);
      finePointer.removeEventListener("change", centerGlow);
    };
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    const spotlight = pointerSpotlightRef.current;
    if (page && spotlight) return attachLandingPointer(page, spotlight);
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sections = homeContent.navSections.map((section) => ({
      id: section.id,
      element: page.querySelector<HTMLElement>(`#${section.id}`)
    }));
    let animationFrame = 0;

    const updateScrollState = () => {
      if (animationFrame) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        const pageBounds = page.getBoundingClientRect();
        const maxScroll = Math.max(pageBounds.height - window.innerHeight, 1);
        const nextProgress = Math.min(
          Math.max(-pageBounds.top / maxScroll, 0),
          1
        );
        const activationPoint = window.innerHeight * 0.38;
        let nextActive: HomeSectionId = homeContent.navSections[0].id;
        // Read all section geometry before writing animation styles.
        const positions = sections.map((section) => ({
          ...section,
          bounds: section.element?.getBoundingClientRect()
        }));
        positions.forEach(({ id, element, bounds }) => {
          if (!element || !bounds) return;
          if (bounds.top <= activationPoint) nextActive = id;
          const parallax = !reducedMotion.matches && finePointer.matches
            ? Math.max(-24, Math.min(24, (window.innerHeight / 2 - bounds.top - bounds.height / 2) * 0.04))
            : 0;
          element.style.setProperty("--home-parallax", `${parallax}px`);
        });
        if (nextProgress >= 0.995) nextActive = homeContent.navSections.at(-1)!.id;
        if (progressRef.current) {
          progressRef.current.style.transform = `scaleX(${nextProgress})`;
        }
        page.style.setProperty("--home-scroll-progress", `${nextProgress}`);
        page.style.setProperty("--home-light-shift", `${nextProgress * 80}px`);
        page.style.setProperty("--home-light-shift-reverse", `${nextProgress * -80}px`);
        page.dataset.activeSection = nextActive;
        setActiveSectionId(nextActive);
      });
    };

    updateScrollState();
    const resizeObserver = "ResizeObserver" in window
      ? new ResizeObserver(updateScrollState)
      : null;
    resizeObserver?.observe(page);
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    reducedMotion.addEventListener("change", updateScrollState);
    finePointer.addEventListener("change", updateScrollState);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      reducedMotion.removeEventListener("change", updateScrollState);
      finePointer.removeEventListener("change", updateScrollState);
    };
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    const navigation = navigationRef.current;
    if (!page || !navigation) return;

    let hashAlignmentFrame = 0;
    const updateNavigationOffset = () => {
      navigationHeightRef.current = Math.ceil(navigation.getBoundingClientRect().height);
      page.style.setProperty(
        "--home-nav-height",
        `${navigationHeightRef.current}px`
      );
    };

    updateNavigationOffset();
    const navigationResizeObserver = "ResizeObserver" in window
      ? new ResizeObserver(updateNavigationOffset)
      : null;
    navigationResizeObserver?.observe(navigation);
    window.addEventListener("resize", updateNavigationOffset);

    hashAlignmentFrame = window.requestAnimationFrame(() => {
      const sectionId = window.location.hash.slice(1) as HomeSectionId;
      if (!homeContent.navSections.some((section) => section.id === sectionId)) return;
      page.querySelector<HTMLElement>(`#${sectionId}`)?.scrollIntoView({
        behavior: "auto",
        block: "start"
      });
    });

    return () => {
      cancelAnimationFrame(hashAlignmentFrame);
      navigationResizeObserver?.disconnect();
      window.removeEventListener("resize", updateNavigationOffset);
      page.style.removeProperty("--home-nav-height");
    };
  }, []);

  useEffect(() => {
    const cancelSectionScroll = () => {
      if (sectionScrollFrameRef.current === null) return;
      cancelAnimationFrame(sectionScrollFrameRef.current);
      sectionScrollFrameRef.current = null;
    };
    const cancelSectionScrollFromKeyboard = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "].includes(event.key)) {
        cancelSectionScroll();
      }
    };

    window.addEventListener("wheel", cancelSectionScroll, { passive: true });
    window.addEventListener("touchstart", cancelSectionScroll, { passive: true });
    window.addEventListener("pointerdown", cancelSectionScroll, { passive: true });
    window.addEventListener("keydown", cancelSectionScrollFromKeyboard);

    return () => {
      cancelSectionScroll();
      window.removeEventListener("wheel", cancelSectionScroll);
      window.removeEventListener("touchstart", cancelSectionScroll);
      window.removeEventListener("pointerdown", cancelSectionScroll);
      window.removeEventListener("keydown", cancelSectionScrollFromKeyboard);
    };
  }, []);

  const handleSectionNavigation =
    (sectionId: HomeSectionId) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) {
        return;
      }

      event.preventDefault();
      const hash = `#${sectionId}`;
      if (window.location.hash !== hash) {
        window.history.pushState(null, "", hash);
      }
      const target = pageRef.current?.querySelector<HTMLElement>(`#${sectionId}`);
      if (!target) return;

      const targetScrollTop = Math.max(
        0,
        window.scrollY
          + target.getBoundingClientRect().top
          - navigationHeightRef.current
          - 12
      );
      const startingScrollTop = window.scrollY;
      const distance = targetScrollTop - startingScrollTop;

      if (sectionScrollFrameRef.current !== null) {
        cancelAnimationFrame(sectionScrollFrameRef.current);
        sectionScrollFrameRef.current = null;
      }

      if (
        Math.abs(distance) < 1
        || window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        window.scrollTo(window.scrollX, targetScrollTop);
        return;
      }

      const duration = getLandingScrollDuration(distance);
      const startedAt = performance.now();
      const animateScroll = (timestamp: number) => {
        const progress = Math.min((timestamp - startedAt) / duration, 1);
        window.scrollTo(
          window.scrollX,
          startingScrollTop + distance * getLandingScrollProgress(progress)
        );

        if (progress < 1) {
          sectionScrollFrameRef.current = requestAnimationFrame(animateScroll);
        } else {
          sectionScrollFrameRef.current = null;
        }
      };

      sectionScrollFrameRef.current = requestAnimationFrame(animateScroll);
    };

  return (
    <main
      className="public-home"
      dir="rtl"
      ref={pageRef}
    >
      <div className="home-pointer-spotlight" data-visible="false" ref={pointerSpotlightRef} aria-hidden="true">
        <span />
      </div>
      <div className="home-atmosphere" aria-hidden="true">
        <span className="home-atmosphere-band home-atmosphere-band-cyan" />
        <span className="home-atmosphere-band home-atmosphere-band-gold" />
        <span className="home-atmosphere-band home-atmosphere-band-navy" />
        <span className="home-atmosphere-haze" />
        <span className="home-atmosphere-particle" />
        <span className="home-atmosphere-particle" />
        <span className="home-atmosphere-particle" />
        <span className="home-atmosphere-particle" />
        <span className="home-atmosphere-particle" />
        <span className="home-atmosphere-particle" />
        <span className="home-atmosphere-particle" />
        <span className="home-atmosphere-particle" />
      </div>
      <div className="home-ambient-world" aria-hidden="true">
        <span>س</span>
        <span>ص</span>
        <span>π</span>
      </div>

      <header className="home-site-nav" ref={navigationRef}>
        <div className="home-site-nav-inner">
          <a
            className="home-site-brand"
            href="/#home-hero"
            onClick={handleSectionNavigation("home-hero")}
          >
            <img alt="" src={homeContent.logoPath} />
            <span>{homeContent.hero.title}</span>
          </a>

          <nav className="home-site-links" aria-label="تنقل الصفحة الرئيسية">
            {homeContent.navSections.map((item, index) => (
              <a
                aria-current={activeSectionId === item.id ? "true" : undefined}
                data-passed={index < homeContent.navSections.findIndex((section) => section.id === activeSectionId)}
                className={
                  activeSectionId === item.id ? "home-site-link active" : "home-site-link"
                }
                href={`/#${item.id}`}
                key={item.id}
                onClick={handleSectionNavigation(item.id)}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <button
            className="home-login-link"
            type="button"
            onClick={() => navigateTo("/login")}
          >
            {homeContent.loginLabel}
          </button>
        </div>
        <div className="home-scroll-progress-frame" aria-hidden="true">
          <span className="home-scroll-progress" ref={progressRef} />
        </div>
      </header>

      <LandingCinematicHero
        active={activeSectionId === "home-hero"}
        onNextSection={handleSectionNavigation("home-program")}
        onRegister={(event) => {
          event.preventDefault();
          navigateTo("/register");
        }}
        onSignIn={(event) => {
          event.preventDefault();
          navigateTo("/login");
        }}
      />

      <section
        className="home-section home-program"
        id="home-program"
        data-current={activeSectionId === "home-program"}
        aria-labelledby="home-program-title"
      >
        <FloatingQuestionField
          className="home-section-questions home-program-questions"
          placements={recognitionQuestionPlacements}
        />

        <div className="home-program-copy" data-reveal>
          <span className="home-stage-kicker">{homeContent.stages["home-program"]}</span>
          <h2 id="home-program-title">{homeContent.program.title}</h2>
          <p>{homeContent.program.intro}</p>

          <div className="home-journey-map" aria-label="رحلتك في عبقور">
            <ol>
              {homeContent.journey.map((step, index) => (
                <li key={step.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="home-learning-list">
            <h3>{homeContent.program.learningTitle}</h3>
            <ul>
              {homeContent.program.learningItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <strong>{homeContent.program.closing}</strong>
        </div>
      </section>

      <section
        className="home-section home-systems"
        id="home-systems"
        data-current={activeSectionId === "home-systems"}
        aria-labelledby="home-systems-title"
      >
        <FloatingQuestionField
          className="home-section-questions home-systems-questions"
          placements={transitionQuestionPlacements}
        />

        <header className="home-systems-heading">
          <span className="home-stage-kicker">{homeContent.stages["home-systems"]}</span>
          <h2 id="home-systems-title">{homeContent.systems.title}</h2>
          <p>{homeContent.systems.intro}</p>
        </header>

        <div className="home-systems-grid">
          <div className="home-systems-browser">
            <HomeBrowserShowcase />
          </div>

          <section className="home-system-panel home-system-panel-adaptive">
            <HomeAdaptiveShowcase />
          </section>

          <section className="home-system-panel home-system-panel-exam">
            <HomeMockExamShowcase />
          </section>
        </div>
      </section>

      <section
        className="home-section home-advice"
        id="home-advice"
        data-current={activeSectionId === "home-advice"}
        aria-labelledby="home-advice-title"
      >
        <div className="home-advice-visual" data-reveal>
          <HomeAdviceUnlockVisual />
        </div>

        <div className="home-advice-copy" dir="rtl" data-reveal>
          <span className="home-stage-kicker">{homeContent.stages["home-advice"]}</span>
          <h2 id="home-advice-title">{homeContent.advice.title}</h2>
          <p>{homeContent.advice.text}</p>
        </div>

        <div className="home-advice-mascot" aria-hidden="true" data-reveal>
          <img alt="" src="/assets/landing/abqoor-aha-inward.png" />
        </div>
      </section>

      <footer className="home-brand-closing" ref={closingRef}>
        <div className="home-brand-closing-content" data-reveal>
          <img
            alt="عبقور - برنامج تدريب القدرات"
            className="home-brand-closing-logo"
            src="/assets/landing/abqoor-logo-complete.png"
          />
          <div className="home-hero-actions" aria-label="ابدأ مع عبقور">
            <a
              className="home-primary-action"
              href="/login"
              onClick={(event) => {
                event.preventDefault();
                navigateTo("/login");
              }}
            >
              ادخل عبقور
            </a>
            <a
              className="home-secondary-action"
              href="/register"
              onClick={(event) => {
                event.preventDefault();
                navigateTo("/register");
              }}
            >
              سجل معانا
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
