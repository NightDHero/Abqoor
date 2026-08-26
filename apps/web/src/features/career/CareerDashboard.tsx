import type { CSSProperties } from "react";
import type { User } from "../../types/auth";
import { navigateTo } from "../../utils/router";
import { HubAvatar } from "./HubAvatar";

const worldEntrances = [
  {
    className: "verbal",
    label: "اللفظي",
    masteryPercent: 0,
    route: "/topic/arabic"
  },
  {
    className: "math",
    label: "الكمي",
    masteryPercent: 0,
    route: "/topic/math"
  }
] as const;

const hubDestinations = [
  { label: "بنك الأخطاء", route: "/review" },
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
  [72, 42, 2, 1],
  [21, 54, 2, 5],
  [33, 13, 3, 7],
  [44, 66, 2, 3],
  [58, 35, 4, 6],
  [63, 81, 2, 0],
  [76, 11, 3, 4],
  [86, 56, 2, 8],
  [51, 24, 2, 2]
] as const;

const energyStreaks = [
  [18, 31, -9, 0],
  [32, 61, -5, 3],
  [45, 37, -2, 6],
  [56, 58, 2, 2],
  [69, 28, 6, 5],
  [82, 67, 10, 1]
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
        {energyStreaks.map(([x, y, angle, delay], index) => (
          <i
            className="hub-world-energy-streak"
            key={`streak-${index}`}
            style={
              {
                "--hub-streak-angle": `${angle}deg`,
                "--hub-streak-delay": `${delay}s`,
                "--hub-streak-x": `${x}%`,
                "--hub-streak-y": `${y}%`
              } as CSSProperties
            }
          />
        ))}
      </div>

      <HubAvatar
        email={user?.email}
        isAdmin={user?.isAdmin}
        onLogout={onLogout}
        username={user?.username}
      />

      <div className="hub-world-composition">
        <div className="hub-world-collision" aria-label="عوالم التعلم">
          {worldEntrances.map((entrance) => (
            <button
              aria-label={`دخول عالم ${entrance.label}`}
              className={`hub-world-force hub-world-force-${entrance.className}`}
              key={entrance.route}
              type="button"
              onClick={() => navigateTo(entrance.route)}
            >
              <span className="hub-world-force-title">
                <strong>{entrance.label}</strong>
                <b>{entrance.masteryPercent.toLocaleString("ar-SA")}%</b>
              </span>
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
