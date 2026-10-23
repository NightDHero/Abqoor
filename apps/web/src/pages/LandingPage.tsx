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
import {
  arrivalQuestionPlacements,
  recognitionQuestionPlacements,
  transitionQuestionPlacements
} from "../features/home/homeQuestionData";
import type { User } from "../types/auth";
import { navigateTo } from "../utils/router";

type HomeSectionId = (typeof homeContent.navSections)[number]["id"];

export const getLandingProgramDestination = (user: User | null) => user
  ? user.mustChangePassword
    ? "/change-password"
    : user.profileCompleted
      ? "/career"
      : "/setup-profile"
  : "/register";

export function LandingPage({ user }: { user: User | null }) {
  const pageRef = useRef<HTMLElement>(null);
  const pointerSpotlightRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [activeSectionId, setActiveSectionId] = useState<HomeSectionId>(
    homeContent.navSections[0].id
  );

  const programDestination = getLandingProgramDestination(user);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || !("IntersectionObserver" in window)) {
      return;
    }

    const revealItems = page.querySelectorAll<HTMLElement>("[data-reveal]");
    const sections = page.querySelectorAll<HTMLElement>(".home-section");
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
    page.querySelector<HTMLElement>(".home-hero-copy")?.classList.add(
      "is-visible"
    );

    return () => {
      observer.disconnect();
      sections.forEach((section) => delete section.dataset.inView);
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
        setActiveSectionId(nextActive);
      });
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    reducedMotion.addEventListener("change", updateScrollState);
    finePointer.addEventListener("change", updateScrollState);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      reducedMotion.removeEventListener("change", updateScrollState);
      finePointer.removeEventListener("change", updateScrollState);
    };
  }, []);

  const handleSectionNavigation =
    (sectionId: HomeSectionId) => (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      pageRef.current?.querySelector<HTMLElement>(`#${sectionId}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start"
      });
    };

  return (
    <main className="public-home" dir="rtl" ref={pageRef}>
      <div className="home-pointer-spotlight" data-visible="false" ref={pointerSpotlightRef} aria-hidden="true">
        <span />
      </div>
      <div className="home-ambient-world" aria-hidden="true">
        <span>س</span>
        <span>ص</span>
        <span>π</span>
      </div>

      <header className="home-site-nav">
        <a
          className="home-site-brand"
          href="#home-hero"
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
              href={`#${item.id}`}
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

        <div className="home-scroll-progress-frame" aria-hidden="true">
          <span
            className="home-scroll-progress"
            ref={progressRef}
          />
        </div>
      </header>

      <section
        className="home-section home-hero"
        id="home-hero"
        data-current={activeSectionId === "home-hero"}
        aria-labelledby="home-hero-title"
      >
        <FloatingQuestionField
          className="home-section-questions home-hero-questions"
          placements={arrivalQuestionPlacements}
        />

        <div className="home-hero-mark" data-reveal>
          <img alt="عبقور" src={homeContent.logoPath} />
        </div>

        <div className="home-hero-copy" data-reveal>
          <p>{homeContent.hero.smallText}</p>
          <h1 id="home-hero-title">{homeContent.hero.headline}</h1>
          <strong>{homeContent.hero.description}</strong>
          <div className="home-hero-actions">
            <button
              className="home-primary-action"
              type="button"
              onClick={() => navigateTo(programDestination)}
            >
              {homeContent.hero.primaryButton}
            </button>
            <button
              className="home-secondary-action"
              type="button"
              onClick={() => navigateTo(user ? programDestination : "/register")}
            >
              {homeContent.hero.secondaryButton}
            </button>
          </div>
        </div>
      </section>

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
          <h2 id="home-program-title">{homeContent.program.title}</h2>
          <p>{homeContent.program.intro}</p>

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

        <header className="home-systems-heading" data-reveal>
          <h2 id="home-systems-title">{homeContent.systems.title}</h2>
          <p>{homeContent.systems.intro}</p>
        </header>

        <div className="home-systems-grid">
          <div className="home-systems-browser" data-reveal>
            <HomeBrowserShowcase />
          </div>

          <section className="home-system-panel home-system-panel-adaptive" data-reveal>
            <HomeAdaptiveShowcase />
          </section>

          <section className="home-system-panel home-system-panel-exam" data-reveal>
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
        <div className="home-advice-copy" data-reveal>
          <h2 id="home-advice-title">{homeContent.advice.title}</h2>
          <p>{homeContent.advice.text}</p>
          <div className="home-advice-cta-stage">
            <img alt="" aria-hidden="true" className="home-advice-brand" src={homeContent.logoPath} />
            <a
              className="home-primary-action home-advice-cta"
              href={user ? programDestination : "/register"}
              onClick={(event) => {
                event.preventDefault();
                navigateTo(user ? programDestination : "/register");
              }}
            >
              <span>{homeContent.advice.cta}</span>
              <i aria-hidden="true" />
            </a>
          </div>
        </div>

        <div data-reveal>
          <HomeAdviceUnlockVisual />
        </div>
      </section>
    </main>
  );
}
