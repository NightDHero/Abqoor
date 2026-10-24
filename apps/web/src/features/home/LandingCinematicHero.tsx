import type { MouseEventHandler } from "react";
import { FloatingQuestionField } from "./HomeProductVisuals";
import { arrivalQuestionPlacements } from "./homeQuestionData";

type LandingCinematicHeroProps = {
  active: boolean;
  onNextSection: MouseEventHandler<HTMLAnchorElement>;
  onRegister: MouseEventHandler<HTMLAnchorElement>;
  onSignIn: MouseEventHandler<HTMLAnchorElement>;
};

export function LandingCinematicHero({
  active,
  onNextSection,
  onRegister,
  onSignIn
}: LandingCinematicHeroProps) {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="home-section home-hero home-cinematic-hero"
      data-current={active}
      id="home-hero"
    >
      <FloatingQuestionField
        className="home-section-questions home-cinematic-hero-questions"
        placements={arrivalQuestionPlacements}
      />

      <div className="home-cinematic-hero-copy" data-reveal>
        <h1 className="home-cinematic-hero-logo" id="home-hero-title">
          <img
            alt="عبقور - برنامج تدريب القدرات"
            src="/assets/landing/abqoor-logo-complete.png"
          />
        </h1>
        <div className="home-hero-actions" aria-label="الدخول إلى عبقور">
          <a className="home-primary-action" href="/login" onClick={onSignIn}>
            ادخل عبقور
          </a>
          <a className="home-secondary-action" href="/register" onClick={onRegister}>
            سجل معانا
          </a>
        </div>
      </div>

      <div className="home-cinematic-hero-mascot" aria-hidden="true" data-reveal>
        <span className="home-cinematic-mascot-orbit" />
        <img alt="" src="/assets/mascot/AbqoorFaceCoolRight.png" />
      </div>

      <a
        aria-label="الانتقال إلى هذا البرنامج"
        className="home-cinematic-scroll-cue"
        href="/#home-program"
        onClick={onNextSection}
      >
        <span>هذا البرنامج</span>
        <i aria-hidden="true" />
      </a>
    </section>
  );
}
