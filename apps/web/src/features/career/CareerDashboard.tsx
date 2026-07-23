import type { CSSProperties } from "react";
import { navigateTo } from "../../utils/router";
import { CareerTopicIcon } from "./CareerTopicIcon";
import { arabicTopics, mathTopics } from "./careerData";
import type { CareerWorldId, TopicPillar } from "./career.types";

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

const hubDestinations = [
  {
    description: "جلسة موجّهة تختار لك الخطوة التالية.",
    eyebrow: "تعلّم موجّه",
    route: "/study",
    title: "حصة"
  },
  {
    description: "تجربة كاملة تحاكي إيقاع اختبار القدرات.",
    eyebrow: "قياس الجاهزية",
    route: "/exam",
    title: "اختبار محاكي"
  },
  {
    description: "ارجع إلى الأسئلة المحفوظة والأخطاء السابقة.",
    eyebrow: "تعلّم من المحاولة",
    route: "/review",
    title: "سجل الأخطاء"
  },
  {
    description: "أهدافك، تاريخك، وتفضيلات رحلتك الدراسية.",
    eyebrow: "هويتك الدراسية",
    route: "/profile",
    title: "ملفي"
  }
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

function WorldTopic({
  subject,
  topic
}: {
  subject: CareerWorldId;
  topic: TopicPillar;
}) {
  return (
    <button
      className="hub-world-topic"
      type="button"
      onClick={() => navigateTo(topic.route)}
    >
      <span className="hub-world-topic-icon">
        <CareerTopicIcon subject={subject} topicSlug={topic.routeSlug} />
      </span>
      <span>{topic.name}</span>
      <strong dir="ltr">0%</strong>
    </button>
  );
}

function WorldPortal({
  subject,
  title,
  topics
}: {
  subject: CareerWorldId;
  title: string;
  topics: TopicPillar[];
}) {
  return (
    <article className={`hub-world-portal hub-world-portal-${subject}`}>
      <header>
        <div>
          <p>{subject === "math" ? "عالم الدقة والبناء" : "عالم الفهم واللغة"}</p>
          <h2>{title}</h2>
        </div>
        <button
          className="hub-world-enter"
          type="button"
          onClick={() => navigateTo(topics[0].route)}
        >
          ادخل العالم
        </button>
      </header>
      <div className="hub-world-topics">
        {topics.map((topic) => (
          <WorldTopic key={topic.id} subject={subject} topic={topic} />
        ))}
      </div>
    </article>
  );
}

export function CareerDashboard() {
  return (
    <section className="career-dashboard" aria-labelledby="career-title">
      <h1 className="career-visually-hidden" id="career-title">
        مركز عبقور
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

      <div className="hub-content">
        <header className="hub-intro">
          <div>
            <p>مركز عبقور</p>
            <h2>إلى أين تريد أن تتجه اليوم؟</h2>
          </div>
          <span>كل مسار يعود إلى هدف واحد: إتقانك.</span>
        </header>

        <div className="hub-worlds">
          <WorldPortal subject="arabic" title="اللفظي" topics={arabicTopics} />
          <WorldPortal subject="math" title="الكمي" topics={mathTopics} />
        </div>

        <div className="hub-destinations" aria-label="وجهات المركز">
          {hubDestinations.map((destination, index) => (
            <button
              className="hub-destination"
              key={destination.route}
              type="button"
              onClick={() => navigateTo(destination.route)}
            >
              <span className="hub-destination-index" dir="ltr">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <small>{destination.eyebrow}</small>
                <strong>{destination.title}</strong>
                <em>{destination.description}</em>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
