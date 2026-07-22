import type { CSSProperties } from "react";
import { arabicTopics, mathTopics } from "./careerData";
import { MasterySplitBar } from "./MasterySplitBar";

const rowCount = Math.max(mathTopics.length, arabicTopics.length);

const ambientParticles = [
  [8, 18, 4, 0],
  [20, 72, 3, 2],
  [34, 35, 5, 4],
  [48, 82, 3, 1],
  [62, 16, 4, 5],
  [75, 58, 5, 3],
  [88, 30, 3, 6],
  [92, 84, 4, 2]
] as const;

function AmbientParticles({ side }: { side: "verbal" | "math" }) {
  return (
    <div aria-hidden="true" className={`career-particles career-particles-${side}`}>
      {ambientParticles.map(([x, y, size, delay], index) => (
        <span
          className="career-particle"
          key={`${side}-${index}`}
          style={
            {
              "--particle-delay": `${delay}s`,
              "--particle-size": `${size}px`,
              "--particle-x": `${x}%`,
              "--particle-y": `${y}%`
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function CareerDashboard() {
  return (
    <section className="career-dashboard" aria-labelledby="career-title">
      <h1 className="career-visually-hidden" id="career-title">
        اللفظي والكمي
      </h1>

      <div aria-hidden="true" className="career-world-atmosphere career-world-verbal" />
      <div aria-hidden="true" className="career-world-atmosphere career-world-math" />
      <AmbientParticles side="verbal" />
      <AmbientParticles side="math" />
      <div aria-hidden="true" className="career-center-bridge">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} />
        ))}
      </div>

      <header className="career-world-headings" aria-hidden="true">
        <span className="career-world-heading career-world-heading-verbal">
          اللفظي
        </span>
        <span className="career-world-heading career-world-heading-math">
          الكمي
        </span>
      </header>

      <div className="career-chart-rows" aria-label="إتقان محاور القدرات">
        {Array.from({ length: rowCount }, (_, index) => {
          const arabicTopic = arabicTopics[index];
          const mathTopic = mathTopics[index];

          return (
            <div className="career-chart-row" key={index}>
              <div className="career-chart-cell career-chart-cell-verbal">
                {arabicTopic ? (
                  <MasterySplitBar side="arabic" topic={arabicTopic} />
                ) : null}
              </div>
              <div className="career-chart-cell career-chart-cell-math">
                {mathTopic ? (
                  <MasterySplitBar side="math" topic={mathTopic} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
