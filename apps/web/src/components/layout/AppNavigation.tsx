import { useLayoutEffect, useRef, useState } from "react";
import { SystemIcon } from "../ui/SystemIcon";
import { homeContent } from "../../features/home/homeContent";
import { navigateTo } from "../../utils/router";

const navigationItems = [
  {
    activePath: "/career",
    icon: "/assets/navigation/hub.png",
    label: "المركز",
    route: "/career"
  },
  {
    activePath: "/study",
    icon: "/assets/navigation/study.png",
    label: "سائل",
    route: "/study"
  },
  {
    activePath: "/exam",
    icon: "/assets/navigation/exam.png",
    label: "اختبار محاكي",
    route: "/exam"
  },
  {
    activePath: "/review",
    icon: "/assets/navigation/error-bank.png",
    label: "بنك الأخطاء",
    route: "/review"
  },
  {
    activePath: "/",
    icon: "/assets/navigation/home.png",
    label: "الموقع",
    route: "/"
  },
  {
    activePath: "/profile",
    label: "ملفي",
    route: "/profile"
  }
] as const;

const adminNavigationItem = {
  activePath: "/admin",
  showSystemIcon: true,
  label: "لوحة الإدارة",
  route: "/admin"
} as const;

type NavigationItem = {
  activePath: string;
  icon?: string;
  label: string;
  route: string;
  showSystemIcon?: boolean;
};

const isItemActive = (currentPath: string, activePath: string) =>
  activePath === "/"
    ? currentPath === "/"
    : currentPath === activePath || currentPath.startsWith(`${activePath}/`);

const getBackFallback = (currentPath: string) => {
  if (currentPath === "/career") {
    return "/";
  }

  if (currentPath.startsWith("/admin")) {
    return "/career";
  }

  return "/career";
};

const goBack = (currentPath: string) => {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  navigateTo(getBackFallback(currentPath));
};

export function AppNavigation({
  currentPath,
  isAdmin = false
}: {
  currentPath: string;
  isAdmin?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [usesTwoRows, setUsesTwoRows] = useState(false);
  const items: NavigationItem[] = isAdmin
    ? [...navigationItems, adminNavigationItem]
    : [...navigationItems];

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const updateLayout = () => {
      const itemElements = Array.from(
        track.querySelectorAll<HTMLElement>(".app-navigation-item")
      );
      const itemWidth = itemElements.reduce(
        (total, item) => total + item.getBoundingClientRect().width,
        0
      );
      const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
      const requiredWidth = itemWidth + gap * Math.max(0, itemElements.length - 1);

      setUsesTwoRows(requiredWidth > track.clientWidth + 1);
    };

    updateLayout();
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(track);
    track
      .querySelectorAll<HTMLElement>(".app-navigation-item")
      .forEach((item) => resizeObserver.observe(item));

    return () => resizeObserver.disconnect();
  }, [isAdmin]);

  const splitIndex = Math.floor(items.length / 2);
  const rows = usesTwoRows
    ? [items.slice(0, splitIndex), items.slice(splitIndex)]
    : [items];

  const renderItem = (item: NavigationItem) => {
    const isActive = isItemActive(currentPath, item.activePath);

    return (
      <a
        aria-current={isActive ? "page" : undefined}
        aria-label={item.label}
        className={
          isActive ? "app-navigation-item active" : "app-navigation-item"
        }
        href={item.route}
        key={item.route}
        onClick={(event) => {
          event.preventDefault();
          navigateTo(item.route);
        }}
      >
        {item.icon || item.showSystemIcon ? (
          <span className="app-navigation-icon">
            {item.icon ? (
              <img alt="" src={item.icon} />
            ) : (
              <SystemIcon name="status" />
            )}
          </span>
        ) : null}
        <span className="app-navigation-label">{item.label}</span>
      </a>
    );
  };

  return (
    <nav className="app-navigation" aria-label="التنقل الرئيسي">
      <div className="app-navigation-shell">
        <button
          aria-label="العودة للصفحة السابقة"
          className="app-navigation-back"
          type="button"
          onClick={() => goBack(currentPath)}
        >
          <SystemIcon name="back" />
        </button>

        <a
          className="app-navigation-brand"
          href="/career"
          onClick={(event) => {
            event.preventDefault();
            navigateTo("/career");
          }}
        >
          <img alt="" src={homeContent.logoPath} />
          <span>عبقور</span>
        </a>

        <div
          className={
            usesTwoRows
              ? "app-navigation-track app-navigation-track-two-rows"
              : "app-navigation-track"
          }
          ref={trackRef}
        >
          {rows.map((row, index) => (
            <div className="app-navigation-row" key={usesTwoRows ? index : "single"}>
              {row.map(renderItem)}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
