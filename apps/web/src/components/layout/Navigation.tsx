import { navigateTo } from "../../utils/router";

const navigationItems = [
  { href: "/career", label: "المركز" },
  { href: "/study", label: "حصة" },
  { href: "/exam", label: "اختبار محاكي" },
  { href: "/review", label: "سجل الأخطاء" },
  { href: "/profile", label: "ملفي" }
];

const isNavigationItemActive = (href: string, currentPath: string) => {
  if (href === "/career") {
    return (
      currentPath === href ||
      currentPath.startsWith("/topic/") ||
      currentPath.startsWith("/browse/")
    );
  }

  return currentPath === href;
};

export function Navigation({
  className,
  currentPath,
  onNavigate
}: {
  className: string;
  currentPath: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className={className} aria-label="التنقل الرئيسي">
      {navigationItems.map((item) => {
        const isActive = isNavigationItemActive(item.href, currentPath);

        return (
          <a
            aria-current={isActive ? "page" : undefined}
            className={isActive ? "nav-link active" : "nav-link"}
            href={item.href}
            key={item.href}
            onClick={(event) => {
              event.preventDefault();
              onNavigate?.();
              navigateTo(item.href);
            }}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
