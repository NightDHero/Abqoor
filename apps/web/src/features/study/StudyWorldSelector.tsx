const studyDestinations = [
  {
    id: "math",
    label: "الكمي"
  },
  {
    id: "mixed",
    label: "كمي ولفظي"
  },
  {
    id: "verbal",
    label: "اللفظي"
  }
] as const;

export function StudyWorldSelector({
  isStarting,
  onSelect
}: {
  isStarting: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="study-world-selector" aria-label="اختر مسار الحصة">
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
          aria-label={`بدء حصة ${destination.label}`}
          className={`study-world-destination study-world-destination-${destination.id}`}
          disabled={isStarting}
          key={destination.id}
          type="button"
          onClick={onSelect}
        >
          <strong>{destination.label}</strong>
        </button>
      ))}
    </div>
  );
}
