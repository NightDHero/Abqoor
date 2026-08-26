import { useEffect, useRef, useState } from "react";
import { navigateTo } from "../../utils/router";

export function HubAvatar({
  email,
  isAdmin,
  onLogout,
  username
}: {
  email?: string;
  isAdmin?: boolean;
  onLogout: () => void | Promise<void>;
  username?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const navigateFromMenu = (route: string) => {
    setIsOpen(false);
    navigateTo(route);
  };

  return (
    <div className="hub-avatar" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="فتح قائمة الحساب"
        className="hub-avatar-trigger"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <img alt="" src="/assets/hub/avatar.png" />
      </button>

      {isOpen ? (
        <div className="hub-profile-menu" role="menu">
          <header className="hub-profile-menu-identity">
            <span className="hub-profile-menu-avatar">
              <img alt="" src="/assets/hub/avatar.png" />
            </span>
            <div>
              <strong>{username ?? "مستخدم عبقور"}</strong>
              {email ? <p dir="ltr">{email}</p> : null}
            </div>
          </header>
          <button
            role="menuitem"
            type="button"
            onClick={() => navigateFromMenu("/profile")}
          >
            ملفي
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => navigateFromMenu("/profile#settings")}
          >
            الإعدادات
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => navigateFromMenu("/")}
          >
            زيارة الموقع
          </button>
          {isAdmin ? (
            <button
              role="menuitem"
              type="button"
              onClick={() => navigateFromMenu("/admin")}
            >
              لوحة الإدارة
            </button>
          ) : null}
          <button
            className="hub-profile-menu-logout"
            role="menuitem"
            type="button"
            onClick={() => {
              setIsOpen(false);
              void onLogout();
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      ) : null}
    </div>
  );
}
