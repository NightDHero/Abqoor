export function ReturnButton({ onReturn }: { onReturn: () => void }) {
  return (
    <button
      aria-label="العودة إلى المحور الكمي"
      className="math-world-return"
      title="العودة إلى المحور الكمي"
      type="button"
      onClick={onReturn}
    >
      <img alt="" src="/assets/topic-world/home.png" />
    </button>
  );
}
