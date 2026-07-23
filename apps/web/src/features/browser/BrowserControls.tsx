import type { BrowserDisplayMode } from "./useQuestionBrowser";

export function BrowserControls({
  displayMode,
  resultCount,
  searchText,
  setDisplayMode,
  setSearchText,
  totalCount
}: {
  displayMode: BrowserDisplayMode;
  resultCount: number;
  searchText: string;
  setDisplayMode: (mode: BrowserDisplayMode) => void;
  setSearchText: (value: string) => void;
  totalCount: number;
}) {
  return (
    <section className="browser-toolbar" aria-label="أدوات التصفح">
      <div className="browser-mode-switch" aria-label="طريقة العرض">
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

      <label className="browser-search">
        <span>ابحث عن سؤال</span>
        <input
          dir="ltr"
          placeholder="رقم السؤال أو Q-001"
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <small>
          {searchText ? `${resultCount} نتيجة` : `${totalCount} سؤال متاح`}
        </small>
      </label>
    </section>
  );
}
