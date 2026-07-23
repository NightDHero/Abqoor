import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent
} from "react";
import { navigateTo } from "../../utils/router";
import type { TopicPillar } from "../career/career.types";
import { MathHub } from "./MathHub";
import {
  createTopicStationLayout,
  MATH_HUB_POSITION,
  MATH_WORLD_SIZE,
  trailGapForRectangle,
  WORLD_DIVIDER_X
} from "./mathWorldLayout";
import { ReturnButton } from "./ReturnButton";
import { TopicStation } from "./TopicStation";
import { TrailPath } from "./TrailPath";
import { useMapCamera } from "./useMapCamera";
import { WorldBoundary } from "./WorldBoundary";
import { WorldCursor } from "./WorldCursor";

type DragState = {
  active: boolean;
  lastTrailX: number;
  lastTrailY: number;
  lastX: number;
  lastY: number;
};

const initialDragState: DragState = {
  active: false,
  lastTrailX: 0,
  lastTrailY: 0,
  lastX: 0,
  lastY: 0
};

const getFocusScale = (viewportWidth: number) => {
  if (viewportWidth < 520) {
    return Math.max(0.68, Math.min(0.78, (viewportWidth - 24) / 470));
  }

  if (viewportWidth < 980) {
    return 0.86;
  }

  return 0.96;
};

const getHubScale = (viewportWidth: number) => {
  if (viewportWidth < 520) {
    return 0.5;
  }

  if (viewportWidth < 980) {
    return 0.58;
  }

  return 0.7;
};

export function MapCanvas({
  selectedTopic,
  topics
}: {
  selectedTopic: TopicPillar;
  topics: TopicPillar[];
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const energyLayerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>({ ...initialDragState });
  const introductionTimerRef = useRef<number | null>(null);
  const navigationTimerRef = useRef<number | null>(null);
  const introducedRef = useRef(false);
  const lastTopicSlugRef = useRef<string | null>(null);
  const lastViewportWidthRef = useRef(0);
  const [activeEffectSlug, setActiveEffectSlug] = useState<string | null>(null);
  const [hoveredTopicSlug, setHoveredTopicSlug] = useState<string | null>(null);
  const stationLayout = useMemo(
    () => createTopicStationLayout(topics),
    [topics]
  );
  const camera = useMapCamera(viewportRef);
  const selectedStation = stationLayout.find(
    ({ topic }) => topic.routeSlug === selectedTopic.routeSlug
  );
  const focusScale = getFocusScale(camera.viewportSize.width);
  const hubScale = getHubScale(camera.viewportSize.width);

  useEffect(() => {
    return () => {
      if (introductionTimerRef.current !== null) {
        window.clearTimeout(introductionTimerRef.current);
      }

      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!camera.isReady || !selectedStation) {
      return;
    }

    const viewportChanged =
      lastViewportWidthRef.current !== camera.viewportSize.width;
    lastViewportWidthRef.current = camera.viewportSize.width;

    if (!introducedRef.current) {
      introducedRef.current = true;
      lastTopicSlugRef.current = selectedTopic.routeSlug;
      camera.jumpTo(MATH_HUB_POSITION, hubScale);
      introductionTimerRef.current = window.setTimeout(() => {
        camera.travelTo(selectedStation.position, focusScale, 900);
        introductionTimerRef.current = null;
      }, 220);
      return;
    }

    if (lastTopicSlugRef.current !== selectedTopic.routeSlug) {
      lastTopicSlugRef.current = selectedTopic.routeSlug;
      camera.travelTo(selectedStation.position, focusScale, 820);
      return;
    }

    if (viewportChanged) {
      camera.jumpTo(selectedStation.position, focusScale);
    }
  }, [
    camera,
    focusScale,
    hubScale,
    selectedStation,
    selectedTopic.routeSlug
  ]);

  const setCursorEnvironment = (clientX: number, clientY: number) => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const worldPoint = camera.screenToWorld(clientX, clientY);
    const dividerDistance = Math.abs(worldPoint.x - WORLD_DIVIDER_X);

    viewport.dataset.cursorEnvironment =
      dividerDistance < 85
        ? "bridge"
        : worldPoint.x < WORLD_DIVIDER_X
          ? "verbal"
          : "math";
  };

  const spawnEnergyTrail = (
    clientX: number,
    clientY: number,
    deltaX: number,
    deltaY: number
  ) => {
    const layer = energyLayerRef.current;
    const viewport = viewportRef.current;

    if (!layer || !viewport) {
      return;
    }

    const distanceFromLast = Math.hypot(
      clientX - dragRef.current.lastTrailX,
      clientY - dragRef.current.lastTrailY
    );

    if (distanceFromLast < 15) {
      return;
    }

    dragRef.current.lastTrailX = clientX;
    dragRef.current.lastTrailY = clientY;

    const rect = viewport.getBoundingClientRect();
    const speed = Math.hypot(deltaX, deltaY);
    const spark = document.createElement("i");
    const environment = viewport.dataset.cursorEnvironment ?? "math";
    spark.className = `math-drag-energy math-drag-energy-${environment}`;
    spark.style.left = `${clientX - rect.left}px`;
    spark.style.top = `${clientY - rect.top}px`;
    spark.style.setProperty(
      "--energy-length",
      `${Math.min(54, Math.max(18, speed * 2.6))}px`
    );
    spark.style.setProperty(
      "--energy-angle",
      `${Math.atan2(deltaY, deltaX)}rad`
    );
    layer.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove(), {
      once: true
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    if (target.closest("button, a")) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      lastTrailX: event.clientX,
      lastTrailY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY
    };
    event.currentTarget.classList.add("is-dragging");
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    setCursorEnvironment(event.clientX, event.clientY);

    if (!dragRef.current.active) {
      return;
    }

    const deltaX = event.clientX - dragRef.current.lastX;
    const deltaY = event.clientY - dragRef.current.lastY;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;
    camera.panBy(deltaX, deltaY);
    spawnEnergyTrail(event.clientX, event.clientY, deltaX, deltaY);
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    event.currentTarget.classList.remove("is-dragging");

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const panDistance = event.shiftKey ? 96 : 48;
    const direction = {
      ArrowDown: [0, -panDistance],
      ArrowLeft: [panDistance, 0],
      ArrowRight: [-panDistance, 0],
      ArrowUp: [0, panDistance]
    }[event.key];

    if (!direction) {
      return;
    }

    event.preventDefault();
    camera.panBy(direction[0], direction[1]);
  };

  const focusTopic = (topic: TopicPillar) => {
    const station = stationLayout.find(
      ({ topic: stationTopic }) => stationTopic.id === topic.id
    );

    if (!station) {
      return;
    }

    setActiveEffectSlug(topic.routeSlug);
    camera.travelTo(station.position, focusScale, 820);

    if (topic.routeSlug !== selectedTopic.routeSlug) {
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
      }

      navigationTimerRef.current = window.setTimeout(() => {
        navigateTo(topic.route);
        navigationTimerRef.current = null;
      }, 560);
    }

    window.setTimeout(() => {
      setActiveEffectSlug((current) =>
        current === topic.routeSlug ? null : current
      );
    }, 720);
  };

  const enterSubtopic = (topicSlug: string, route: string) => {
    setActiveEffectSlug(topicSlug);

    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current);
    }

    navigationTimerRef.current = window.setTimeout(() => {
      navigateTo(route);
      navigationTimerRef.current = null;
    }, 260);
  };

  const returnToHub = () => {
    setHoveredTopicSlug(null);
    setActiveEffectSlug(null);
    camera.travelTo(MATH_HUB_POSITION, hubScale, 760);

    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current);
    }

    navigationTimerRef.current = window.setTimeout(() => {
      navigateTo("/career");
      navigationTimerRef.current = null;
    }, 720);
  };

  const transformStyle = {
    "--map-scale": camera.camera.scale,
    "--map-x": `${camera.camera.x}px`,
    "--map-y": `${camera.camera.y}px`
  } as CSSProperties;

  return (
    <section
      aria-label="عالم المحاور الكمية"
      className="math-map-world"
      data-traveling={camera.isTraveling ? "true" : "false"}
    >
      <div
        aria-label="خريطة تفاعلية للمحاور الكمية. اسحب للتحرك واستخدم مفاتيح الأسهم للتنقل."
        className="math-map-viewport"
        data-cursor-environment="math"
        ref={viewportRef}
        role="application"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerCancel={stopDragging}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
      >
        <div
          className={`math-map-stage ${
            camera.isTraveling ? "is-traveling" : ""
          }`}
          style={transformStyle}
        >
          <WorldBoundary />

          <svg
            aria-hidden="true"
            className="math-world-trails"
            height={MATH_WORLD_SIZE.height}
            viewBox={`0 0 ${MATH_WORLD_SIZE.width} ${MATH_WORLD_SIZE.height}`}
            width={MATH_WORLD_SIZE.width}
          >
            {stationLayout.map((station, index) => (
              <TrailPath
                active={hoveredTopicSlug === station.topic.routeSlug}
                curveDirection={index % 2 === 0 ? 1 : -1}
                end={station.position}
                endGap={trailGapForRectangle(
                  station.position,
                  MATH_HUB_POSITION,
                  250,
                  260,
                  24
                )}
                key={`hub-${station.topic.id}`}
                start={MATH_HUB_POSITION}
                startGap={trailGapForRectangle(
                  MATH_HUB_POSITION,
                  station.position,
                  295,
                  295,
                  24
                )}
                variant="hub"
              />
            ))}
            {stationLayout.map((station, index) => {
              const nextStation =
                stationLayout[(index + 1) % stationLayout.length];

              return (
                <TrailPath
                  active={
                    hoveredTopicSlug === station.topic.routeSlug ||
                    hoveredTopicSlug === nextStation.topic.routeSlug
                  }
                  curveDirection={index % 2 === 0 ? -1 : 1}
                  end={nextStation.position}
                  endGap={trailGapForRectangle(
                    nextStation.position,
                    station.position,
                    250,
                    260
                  )}
                  key={`ring-${station.topic.id}`}
                  start={station.position}
                  startGap={trailGapForRectangle(
                    station.position,
                    nextStation.position,
                    250,
                    260
                  )}
                  variant="ring"
                />
              );
            })}
          </svg>

          <MathHub
            onSelectTopic={focusTopic}
            position={MATH_HUB_POSITION}
            topics={topics}
          />

          {stationLayout.map((station) => (
            <div
              className={
                activeEffectSlug === station.topic.routeSlug
                  ? "math-station-activation is-active"
                  : "math-station-activation"
              }
              key={station.topic.id}
              style={{
                left: station.position.x,
                top: station.position.y
              }}
            >
              <TopicStation
                active={station.topic.routeSlug === selectedTopic.routeSlug}
                onEnterSubtopic={(route) =>
                  enterSubtopic(station.topic.routeSlug, route)
                }
                onFocus={() => focusTopic(station.topic)}
                onHover={(isHovering) =>
                  setHoveredTopicSlug(
                    isHovering ? station.topic.routeSlug : null
                  )
                }
                position={{ x: 0, y: 0 }}
                topic={station.topic}
              />
            </div>
          ))}
        </div>

        <div
          aria-hidden="true"
          className="math-world-energy-layer"
          ref={energyLayerRef}
        />
        <WorldCursor viewportRef={viewportRef} />
        <ReturnButton onReturn={returnToHub} />
      </div>
    </section>
  );
}
