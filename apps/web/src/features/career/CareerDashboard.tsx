import type { CSSProperties } from "react";
import type { User } from "../../types/auth";
import { navigateTo } from "../../utils/router";
import { HubAvatar } from "./HubAvatar";

const worldEntrances = [
  {
    asset: "/assets/hub/arabic.png",
    className: "verbal",
    label: "اللفظي",
    route: "/topic/arabic/verbal-analogy"
  },
  {
    asset: "/assets/hub/math.png",
    className: "math",
    label: "الكمي",
    route: "/topic/math/arithmetic"
  }
] as const;

const hubDestinations = [
  { label: "الرئيسية", route: "/" },
  { label: "حصة", route: "/study" },
  { label: "اختبار محاكي", route: "/exam" },
  { label: "ملفي", route: "/profile" }
] as const;

const particles = [
  [7, 17, 4, 0],
  [14, 72, 3, 2],
  [27, 32, 5, 4],
  [39, 84, 3, 1],
  [54, 15, 4, 5],
  [67, 66, 5, 3],
  [81, 27, 3, 6],
  [93, 77, 4, 2],
  [47, 48, 3, 7],
  [72, 42, 2, 1]
] as const;

export function CareerDashboard({
  onLogout,
  user
}: {
  onLogout: () => void;
  user: User | null;
}) {
  return (
    <section className="hub-world-map" aria-labelledby="hub-world-title">
      <h1 className="career-visually-hidden" id="hub-world-title">
        مركز عبقور
      </h1>

      <div aria-hidden="true" className="hub-world-atmosphere">
        <span className="hub-atmosphere-verbal" />
        <span className="hub-atmosphere-math" />
        <span className="hub-atmosphere-bridge" />
        {particles.map(([x, y, size, delay], index) => (
          <i
            className="hub-world-particle"
            key={index}
            style={
              {
                "--hub-particle-delay": `${delay}s`,
                "--hub-particle-size": `${size}px`,
                "--hub-particle-x": `${x}%`,
                "--hub-particle-y": `${y}%`
              } as CSSProperties
            }
          />
        ))}
      </div>

      <HubAvatar email={user?.email} onLogout={onLogout} />

      <div className="hub-world-composition">
        <div className="hub-world-entrances" aria-label="عوالم التعلم">
          {worldEntrances.map((entrance) => (
            <button
              aria-label={`دخول عالم ${entrance.label}`}
              className={`hub-world-entrance hub-world-entrance-${entrance.className}`}
              key={entrance.route}
              type="button"
              onClick={() => navigateTo(entrance.route)}
            >
              <span className="hub-world-icon-shell">
                <span className="hub-world-icon-glow" />
                <img alt="" src={entrance.asset} />
              </span>
              <strong>{entrance.label}</strong>
            </button>
          ))}
        </div>

        <nav className="hub-world-destinations" aria-label="وجهات مركز عبقور">
          {hubDestinations.map((destination) => (
            <a
              className="hub-world-destination"
              href={destination.route}
              key={destination.route}
              onClick={(event) => {
                event.preventDefault();
                navigateTo(destination.route);
              }}
            >
              <strong>{destination.label}</strong>
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
