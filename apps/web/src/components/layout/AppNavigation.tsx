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
    label: "حصة",
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

const isItemActive = (currentPath: string, activePath: string) =>
  activePath === "/"
    ? currentPath === "/"
    : currentPath === activePath || currentPath.startsWith(`${activePath}/`);

export function AppNavigation({ currentPath }: { currentPath: string }) {
  return (
    <nav className="app-navigation" aria-label="التنقل الرئيسي">
      <div className="app-navigation-track">
        {navigationItems.map((item) => {
          const isActive = isItemActive(currentPath, item.activePath);

          return (
            <a
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={isActive ? "app-navigation-item active" : "app-navigation-item"}
              href={item.route}
              key={item.route}
              onClick={(event) => {
                event.preventDefault();
                navigateTo(item.route);
              }}
            >
              <span className="app-navigation-icon">
                <img alt="" src={item.icon} />
              </span>
              <span className="app-navigation-label">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
