import { navigateTo } from "../../utils/router";

const navigationItems = [
  { href: "/career", label: "المسار" },
  { href: "/study", label: "الدراسة" },
  { href: "/exam", label: "الاختبار" },
  { href: "/review", label: "المراجعة" },
  { href: "/profile", label: "الملف" }
];

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
      {navigationItems.map((item) => (
        <a
          aria-current={currentPath === item.href ? "page" : undefined}
          className={currentPath === item.href ? "nav-link active" : "nav-link"}
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
      ))}
    </nav>
  );
}
