const studyDestinations = [
  {
    id: "math",
    label: "الكمي",
    description: "مسائل وحساب وتحليل",
    subjectId: "math"
  },
  {
    id: "mixed",
    label: "كمي ولفظي",
    description: "جلسة متوازنة بين المسارين",
    subjectId: undefined
  },
  {
    id: "verbal",
    label: "اللفظي",
    description: "لغة وفهم واستدلال",
    subjectId: "arabic"
  }
] as const;

export function StudyWorldSelector({
  isStarting,
  onSelect
}: {
  isStarting: boolean;
  onSelect: (subjectId?: "math" | "arabic") => void;
}) {
  return (
    <div className="study-world-selector" aria-label="اختر مسار سائل">
      <div className="study-world-atmosphere" aria-hidden="true">
        <span className="study-world-glow study-world-glow-verbal" />
        <span className="study-world-glow study-world-glow-mixed" />
        <span className="study-world-glow study-world-glow-math" />
        {Array.from({ length: 14 }, (_, index) => (
          <span className={`study-world-particle particle-${index + 1}`} key={index} />
        ))}
      </div>
      {studyDestinations.map((destination) => (
        <button
          aria-label={`بدء سائل ${destination.label}`}
          className={`study-world-destination study-world-destination-${destination.id}`}
          disabled={isStarting}
          key={destination.id}
          type="button"
          onClick={() => onSelect(destination.subjectId)}
        >
          <span className="study-world-destination-index" aria-hidden="true">
            {String(studyDestinations.indexOf(destination) + 1).padStart(2, "0")}
          </span>
          <span className="study-world-destination-copy">
            <strong>{destination.label}</strong>
            <small>{destination.description}</small>
          </span>
          <span className="study-world-destination-action" aria-hidden="true">ابدأ</span>
        </button>
      ))}
    </div>
  );
}
