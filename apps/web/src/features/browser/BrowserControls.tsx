import { useRef, useState } from "react";
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
  const [isSearchExpanded, setIsSearchExpanded] = useState(Boolean(searchText));
  const searchInputRef = useRef<HTMLInputElement>(null);

  const expandSearch = () => {
    if (!isSearchExpanded) {
      setIsSearchExpanded(true);
      requestAnimationFrame(() => searchInputRef.current?.focus());
      return;
    }

    searchInputRef.current?.focus();
  };

  return (
    <section className="browser-toolbar" aria-label="أدوات التصفح">
      <div className="browser-mode-switch" aria-label="طريقة العرض">
        <button
          aria-pressed={displayMode === "question"}
          className={displayMode === "question" ? "selected" : undefined}
          type="button"
          onClick={() => setDisplayMode("question")}
        >
          سؤال
        </button>
        <button
          aria-pressed={displayMode === "gallery"}
          className={displayMode === "gallery" ? "selected" : undefined}
          type="button"
          onClick={() => setDisplayMode("gallery")}
        >
          معرض
        </button>
        <button
          aria-pressed={displayMode === "immersive"}
          className={displayMode === "immersive" ? "selected" : undefined}
          type="button"
          onClick={() => setDisplayMode("immersive")}
        >
          <img
            alt=""
            className="browser-mode-icon"
            src="/assets/modes/immersive-scroll.png"
          />
          سَائِل
        </button>
      </div>

      <div
        className={
          isSearchExpanded
            ? "browser-search-control expanded"
            : "browser-search-control"
        }
      >
        <button
          aria-expanded={isSearchExpanded}
          aria-label="فتح البحث برقم السؤال"
          className="browser-search-trigger"
          type="button"
          onClick={expandSearch}
        >
          <img
            alt=""
            className="browser-search-icon"
            src="/assets/actions/search.png"
          />
        </button>
        <label className="browser-search">
          <span className="visually-hidden">ابحث عن سؤال</span>
          <input
            ref={searchInputRef}
            dir="ltr"
            placeholder="رقم السؤال"
            tabIndex={isSearchExpanded ? 0 : -1}
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") {
                return;
              }

              if (searchText) {
                setSearchText("");
              } else {
                setIsSearchExpanded(false);
              }
            }}
          />
          <small aria-live="polite">
            {searchText ? `${resultCount} نتيجة` : `${totalCount} سؤال متاح`}
          </small>
        </label>
      </div>
    </section>
  );
}
