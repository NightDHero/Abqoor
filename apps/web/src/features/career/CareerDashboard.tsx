import { useCallback, useState, type CSSProperties } from "react";
import type { StudyProgressResponse } from "../../types/session";
import { navigateTo } from "../../utils/router";
import { StudyProgressTracker } from "./StudyProgressTracker";

const careerElements = [
  {
    accent: "math",
    column: "left",
    label: "كمي",
    progress: "math",
    route: "/topic/math",
    row: 1
  },
  {
    accent: "verbal",
    column: "right",
    label: "لفظي",
    progress: "arabic",
    route: "/topic/arabic",
    row: 1
  },
  {
    accent: "errors",
    column: "left",
    label: "بنك الأخطاء",
    progress: "errors",
    route: "/review",
    row: 2
  },
  {
    accent: "banks",
    column: "right",
    label: "الأقسام",
    progress: "banks",
    route: null,
    row: 2
  },
  {
    accent: "sail",
    column: "left",
    label: "سائل",
    progress: null,
    route: "/study",
    row: 3
  },
  {
    accent: "exam",
    column: "right",
    label: "الاختبار التجريبي",
    progress: null,
    route: "/exam",
    row: 3
  }
] as const;

const emptyCareerProgress: StudyProgressResponse["career"] = {
  arabic: {
    answeredQuestions: 0,
    bankPercent: 0,
    errorBankPercent: 0,
    incorrectAnswers: 0
  },
  math: {
    answeredQuestions: 0,
    bankPercent: 0,
    errorBankPercent: 0,
    incorrectAnswers: 0
  }
};

type CareerProgress = StudyProgressResponse["career"];

const ArabicPercent = ({ value }: { value: number }) => (
  <>{value.toLocaleString("ar-SA")}%</>
);

const CareerElementProgress = ({
  progress,
  type
}: {
  progress: CareerProgress;
  type: (typeof careerElements)[number]["progress"];
}) => {
  if (type === "math" || type === "arabic") {
    return (
      <b className="hub-world-force-progress">
        <ArabicPercent value={progress[type].bankPercent} />
      </b>
    );
  }

  if (type === "banks" || type === "errors") {
    const percentageKey = type === "banks" ? "bankPercent" : "errorBankPercent";

    return (
      <b className="hub-world-force-progress hub-world-force-progress-pair">
        <span>
          كمي <ArabicPercent value={progress.math[percentageKey]} />
        </span>
        <span>
          لفظي <ArabicPercent value={progress.arabic[percentageKey]} />
        </span>
      </b>
    );
  }

  return null;
};

const particles = [
  [7, 17, 4, 0],
  [14, 72, 3, 2],
  [27, 32, 5, 4],
  [39, 84, 3, 1],
  [54, 15, 4, 5],
  [67, 66, 5, 3],
  [81, 27, 3, 6],
  [93, 77, 4, 2],
  [47, 48, 3, 7],
  [72, 42, 2, 1],
  [33, 13, 3, 7],
  [44, 66, 2, 3],
  [58, 35, 4, 6],
  [63, 81, 2, 0],
  [76, 11, 3, 4],
  [86, 56, 2, 8],
  [51, 24, 2, 2]
] as const;

const energyStreaks = [
  [18, 31, -9, 0],
  [32, 61, -5, 3],
  [45, 37, -2, 6],
  [56, 58, 2, 2],
  [69, 28, 6, 5],
  [82, 67, 10, 1]
] as const;

export function CareerDashboard() {
  const [careerProgress, setCareerProgress] = useState(emptyCareerProgress);
  const handleCareerProgressLoaded = useCallback((progress: CareerProgress) => {
    setCareerProgress(progress);
  }, []);

  return (
    <section className="hub-world-map" aria-labelledby="hub-world-title">
      <h1 className="career-visually-hidden" id="hub-world-title">
        مركز عبقور
      </h1>

      <div aria-hidden="true" className="hub-world-atmosphere">
        <span className="hub-atmosphere-verbal" />
        <span className="hub-atmosphere-math" />
        <span className="hub-atmosphere-bridge" />
        {particles.map(([x, y, size, delay], index) => (
          <i
            className="hub-world-particle"
            key={index}
            style={
              {
                "--hub-particle-delay": `${delay}s`,
                "--hub-particle-size": `${size}px`,
                "--hub-particle-x": `${x}%`,
                "--hub-particle-y": `${y}%`
              } as CSSProperties
            }
          />
        ))}
        {energyStreaks.map(([x, y, angle, delay], index) => (
          <i
            className="hub-world-energy-streak"
            key={`streak-${index}`}
            style={
              {
                "--hub-streak-angle": `${angle}deg`,
                "--hub-streak-delay": `${delay}s`,
                "--hub-streak-x": `${x}%`,
                "--hub-streak-y": `${y}%`
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="hub-home-stage">
        <StudyProgressTracker onCareerProgressLoaded={handleCareerProgressLoaded} />

        <div className="hub-world-composition">
          <nav className="hub-world-collision" aria-label="عوالم ووجهات التعلم">
            {careerElements.map((element) => {
              const content = (
                <span className="hub-world-force-title">
                  <strong>{element.label}</strong>
                  <CareerElementProgress
                    progress={careerProgress}
                    type={element.progress}
                  />
                </span>
              );
              const className = [
                "hub-world-force",
                `hub-world-force-${element.accent}`,
                `hub-world-force-column-${element.column}`,
                `hub-world-force-row-${element.row}`
              ].join(" ");

              return element.route ? (
                <a
                  aria-label={`الانتقال إلى ${element.label}`}
                  className={className}
                  href={element.route}
                  key={element.label}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateTo(element.route);
                  }}
                >
                  {content}
                </a>
              ) : (
                <div
                  aria-label={element.label}
                  className={className}
                  key={element.label}
                >
                  {content}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </section>
  );
}
