import type { BrowserDisplayMode } from "./useQuestionBrowser";

export function BrowserControls({
  displayMode,
  jumpText,
  onJump,
  searchText,
  setDisplayMode,
  setJumpText,
  setSearchText
}: {
  displayMode: BrowserDisplayMode;
  jumpText: string;
  onJump: () => void;
  searchText: string;
  setDisplayMode: (mode: BrowserDisplayMode) => void;
  setJumpText: (value: string) => void;
  setSearchText: (value: string) => void;
}) {
  return (
    <section className="browser-panel" aria-label="أدوات التصفح">
      <div className="browser-mode-switch">
        <button
          aria-pressed={displayMode === "question"}
          className={displayMode === "question" ? "selected" : undefined}
          type="button"
          onClick={() => setDisplayMode("question")}
        >
          وضع السؤال
        </button>
        <button
          aria-pressed={displayMode === "gallery"}
          className={displayMode === "gallery" ? "selected" : undefined}
          type="button"
          onClick={() => setDisplayMode("gallery")}
        >
          وضع التصفح
        </button>
      </div>

      <label className="form-field">
        بحث فوري برقم السؤال أو المعرّف
        <input
          dir="ltr"
          placeholder="Q-001 أو 1"
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </label>

      <div className="browser-jump-row">
        <label className="form-field">
          انتقال مباشر
          <input
            dir="ltr"
            placeholder="Q-010 أو 10"
            type="text"
            value={jumpText}
            onChange={(event) => setJumpText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onJump();
              }
            }}
          />
        </label>
        <button type="button" onClick={onJump}>
          اذهب
        </button>
      </div>
    </section>
  );
}
