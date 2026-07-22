import { formatPercent } from "../../utils/format";
import { navigateTo } from "../../utils/router";
import type { CareerWorld, TopicPillar } from "../career/career.types";
import { SubtopicPillar } from "./SubtopicPillar";

export function TopicWorld({
  topic,
  world
}: {
  topic: TopicPillar;
  world: CareerWorld;
}) {
  const isMathWorld = world.id === "math";
  const subtopics = topic.subtopics ?? [];

  return (
    <section className="topic-world" aria-labelledby="topic-world-title">
      <div className="topic-world-hero">
        <button
          className="secondary"
          type="button"
          onClick={() => navigateTo("/career")}
        >
          العودة إلى المسار
        </button>
        <p className="page-eyebrow">{world.label}</p>
        <h1 className="page-title" id="topic-world-title">
          {topic.name}
        </h1>
        <p className="page-description">
          هذا عالم تعلم مستقل داخل عبقور. يبدأ من {formatPercent(0)}، وسيعرض
          تقدمك الحقيقي عندما تتوفر بيانات الإتقان في المراحل القادمة.
        </p>
      </div>

      {isMathWorld ? (
        <section className="topic-world-section" aria-labelledby="subtopics-title">
          <div className="topic-world-section-heading">
            <div>
              <p className="page-eyebrow">مهارات هذا العالم</p>
              <h2 id="subtopics-title">المحاور الفرعية</h2>
            </div>
            <span className="empty-state-chip">كلها 0%</span>
          </div>

          <div className="subtopic-scroll" aria-label="المحاور الفرعية">
            {subtopics.map((subtopic) => (
              <SubtopicPillar key={subtopic.id} subtopic={subtopic} />
            ))}
          </div>
        </section>
      ) : (
        <section className="topic-entry-panel" aria-labelledby="arabic-entry-title">
          <p className="page-eyebrow">دخول مباشر</p>
          <h2 id="arabic-entry-title">{topic.name}</h2>
          <p>
            هذا المحور اللفظي لا يحتوي على محاور فرعية في هيكل المرحلة الحالية.
            الخطوة التالية هي الدخول إلى التدريب مباشرة.
          </p>
          <button type="button" onClick={() => navigateTo(topic.practiceRoute)}>
            ابدأ التدريب
          </button>
        </section>
      )}
    </section>
  );
}
