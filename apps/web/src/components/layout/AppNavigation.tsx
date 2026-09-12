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
    label: "سَائِل",
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
    icon: "/assets/navigation/settings.png",
    label: "الإعدادات",
    route: "/profile#settings"
  }
] as const;

const adminNavigationItem = {
  activePath: "/admin",
  icon: "",
  label: "لوحة الإدارة",
  route: "/admin"
} as const;

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
  const items = isAdmin
    ? [...navigationItems, adminNavigationItem]
    : navigationItems;

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

        <div className="app-navigation-track">
          {items.map((item) => {
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
                <span className="app-navigation-icon">
                  {item.icon ? (
                    <img alt="" src={item.icon} />
                  ) : (
                    <SystemIcon name="status" />
                  )}
                </span>
                <span className="app-navigation-label">{item.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
