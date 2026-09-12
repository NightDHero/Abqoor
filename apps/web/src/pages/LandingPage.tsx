import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  FloatingQuestionField,
  HomeAdaptiveShowcase,
  HomeAdviceUnlockVisual,
  HomeBrowserShowcase,
  HomeMockExamShowcase,
  HomepageMiniExamDemo
} from "../features/home/HomeProductVisuals";
import { homeContent } from "../features/home/homeContent";
import {
  arrivalQuestionPlacements,
  recognitionQuestionPlacements,
  transitionQuestionPlacements
} from "../features/home/homeQuestionData";
import type { User } from "../types/auth";
import { navigateTo } from "../utils/router";

type HomeSectionId = (typeof homeContent.navSections)[number]["id"];

export function LandingPage({
  isLoadingUser,
  user
}: {
  isLoadingUser: boolean;
  user: User | null;
}) {
  const pageRef = useRef<HTMLElement>(null);
  const [activeSectionId, setActiveSectionId] = useState<HomeSectionId>(
    homeContent.navSections[0].id
  );
  const [scrollProgress, setScrollProgress] = useState(0);

  const programDestination = user
    ? user.profileCompleted
      ? "/career"
      : "/setup-profile"
    : "/register";

  useEffect(() => {
    const page = pageRef.current;
    if (!page) {
      return;
    }

    const revealItems = page.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        rootMargin: "-7% 0px -10%",
        threshold: 0.14
      }
    );

    revealItems.forEach((item) => observer.observe(item));
    page.querySelector<HTMLElement>(".home-hero-copy")?.classList.add(
      "is-visible"
    );

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let animationFrame = 0;

    const updateScrollState = () => {
      cancelAnimationFrame(animationFrame);

      animationFrame = window.requestAnimationFrame(() => {
        const documentElement = document.documentElement;
        const maxScroll = Math.max(
          documentElement.scrollHeight - window.innerHeight,
          1
        );
        const nextProgress = Math.min(
          Math.max(window.scrollY / maxScroll, 0),
          1
        );
        const activationPoint = window.innerHeight * 0.38;
        const nextActive =
          homeContent.navSections.reduce<HomeSectionId>(
            (currentActive, section) => {
              const element = document.getElementById(section.id);

              if (
                element &&
                element.getBoundingClientRect().top <= activationPoint
              ) {
                return section.id;
              }

              return currentActive;
            },
            homeContent.navSections[0].id
          );

        setScrollProgress(nextProgress);
        setActiveSectionId(nextActive);
      });
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  const handleSectionNavigation =
    (sectionId: HomeSectionId) => (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    };

  return (
    <main className="public-home" dir="rtl" ref={pageRef}>
      <div className="home-ambient-world" aria-hidden="true">
        <i />
        <i />
        <i />
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
          {homeContent.navSections.map((item) => (
            <a
              aria-current={activeSectionId === item.id ? "true" : undefined}
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
            style={{ transform: `scaleX(${scrollProgress})` }}
          />
        </div>
      </header>

      <section
        className="home-section home-hero"
        id="home-hero"
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
          <h1 id="home-hero-title">{homeContent.hero.title}</h1>
          <strong>{homeContent.hero.description}</strong>
          <div className="home-hero-actions">
            <button
              className="home-primary-action"
              disabled={isLoadingUser}
              type="button"
              onClick={() => navigateTo(programDestination)}
            >
              {homeContent.hero.primaryButton}
            </button>
            <button
              className="home-secondary-action"
              disabled={isLoadingUser}
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

        <div data-reveal>
          <HomepageMiniExamDemo />
        </div>
      </section>

      <section
        className="home-section home-systems"
        id="home-systems"
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
        aria-labelledby="home-advice-title"
      >
        <div className="home-advice-copy" data-reveal>
          <h2 id="home-advice-title">{homeContent.advice.title}</h2>
          <p>{homeContent.advice.text}</p>
          <button
            className="home-primary-action"
            disabled={isLoadingUser}
            type="button"
            onClick={() => navigateTo(user ? programDestination : "/register")}
          >
            {homeContent.advice.cta}
          </button>
        </div>

        <div data-reveal>
          <HomeAdviceUnlockVisual />
        </div>
      </section>
    </main>
  );
}
