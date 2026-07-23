export function ReturnButton({
  label,
  onReturn
}: {
  label: string;
  onReturn: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="math-world-return"
      title={label}
      type="button"
      onClick={onReturn}
    >
      <img alt="" src="/assets/topic-world/home.png" />
    </button>
  );
}
