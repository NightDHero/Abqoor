const studyDestinations = [
  {
    id: "math",
    label: "الكمي",
    subjectId: "math"
  },
  {
    id: "mixed",
    label: "كمي ولفظي",
    subjectId: undefined
  },
  {
    id: "verbal",
    label: "اللفظي",
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
    <div className="study-world-selector" aria-label="اختر مسار سحب">
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
          aria-label={`بدء سحب ${destination.label}`}
          className={`study-world-destination study-world-destination-${destination.id}`}
          disabled={isStarting}
          key={destination.id}
          type="button"
          onClick={() => onSelect(destination.subjectId)}
        >
          <strong>{destination.label}</strong>
        </button>
      ))}
    </div>
  );
}
