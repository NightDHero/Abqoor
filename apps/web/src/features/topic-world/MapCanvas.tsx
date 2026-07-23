import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type WheelEvent
} from "react";
import { navigateTo } from "../../utils/router";
import { findCareerWorld } from "../career/careerData";
import type {
  CareerWorld,
  CareerWorldId,
  TopicPillar
} from "../career/career.types";
import { MathHub } from "./MathHub";
import {
  createTopicStationLayout,
  MATH_HUB_POSITION,
  MATH_WORLD_SIZE,
  trailGapForRectangle
} from "./mathWorldLayout";
import { TopicStation } from "./TopicStation";
import { TrailPath } from "./TrailPath";
import { useMapCamera } from "./useMapCamera";
import { WorldBoundary } from "./WorldBoundary";
import { WorldCursor } from "./WorldCursor";
import { WorldSwitch } from "./WorldSwitch";

type PointerPosition = {
  x: number;
  y: number;
};

type DragState = {
  dragging: boolean;
  last: PointerPosition;
  lastTrail: PointerPosition;
  moved: boolean;
  pointerId: number | null;
  start: PointerPosition;
};

const initialDragState: DragState = {
  dragging: false,
  last: { x: 0, y: 0 },
  lastTrail: { x: 0, y: 0 },
  moved: false,
  pointerId: null,
  start: { x: 0, y: 0 }
};

const DRAG_THRESHOLD = 7;
const getFocusScale = (viewportWidth: number) => {
  if (viewportWidth < 520) {
    return Math.max(0.66, Math.min(0.76, (viewportWidth - 24) / 500));
  }

  if (viewportWidth < 980) {
    return 0.84;
  }

  return 0.94;
};

const getHubScale = (viewportWidth: number) => {
  if (viewportWidth < 520) {
    return 0.48;
  }

  if (viewportWidth < 980) {
    return 0.58;
  }

  return 0.68;
};

const distanceBetweenPointers = (
  first: PointerPosition,
  second: PointerPosition
) => Math.hypot(second.x - first.x, second.y - first.y);

export function MapCanvas({
  selectedTopic,
  topics,
  world
}: {
  selectedTopic: TopicPillar;
  topics: TopicPillar[];
  world: CareerWorld;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const energyLayerRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, PointerPosition>());
  const dragRef = useRef<DragState>({ ...initialDragState });
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const suppressClickRef = useRef(false);
  const lastTapRef = useRef<{ at: number; x: number; y: number } | null>(null);
  const introductionTimerRef = useRef<number | null>(null);
  const navigationTimerRef = useRef<number | null>(null);
  const introducedWorldRef = useRef<CareerWorldId | null>(null);
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

    if (introducedWorldRef.current !== world.id) {
      introducedWorldRef.current = world.id;
      lastTopicSlugRef.current = selectedTopic.routeSlug;
      camera.jumpTo(MATH_HUB_POSITION, hubScale);
      introductionTimerRef.current = window.setTimeout(() => {
        camera.travelTo(selectedStation.position, focusScale, 900);
        introductionTimerRef.current = null;
      }, 180);
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
    selectedTopic.routeSlug,
    world.id
  ]);

  const resetCamera = () => {
    if (selectedStation) {
      camera.travelTo(selectedStation.position, focusScale, 680);
    }
  };

  const cancelPendingNavigationAndReset = () => {
    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = null;
    }
    setActiveEffectSlug(null);
    resetCamera();
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
      clientX - dragRef.current.lastTrail.x,
      clientY - dragRef.current.lastTrail.y
    );

    if (distanceFromLast < 16) {
      return;
    }

    dragRef.current.lastTrail = { x: clientX, y: clientY };

    const rect = viewport.getBoundingClientRect();
    const speed = Math.hypot(deltaX, deltaY);
    const spark = document.createElement("i");
    spark.className = `math-drag-energy math-drag-energy-${world.id}`;
    spark.style.left = `${clientX - rect.left}px`;
    spark.style.top = `${clientY - rect.top}px`;
    spark.style.setProperty(
      "--energy-length",
      `${Math.min(48, Math.max(16, speed * 2.4))}px`
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
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });

    if (pointersRef.current.size === 1) {
      dragRef.current = {
        dragging: false,
        last: { x: event.clientX, y: event.clientY },
        lastTrail: { x: event.clientX, y: event.clientY },
        moved: false,
        pointerId: event.pointerId,
        start: { x: event.clientX, y: event.clientY }
      };
      return;
    }

    if (pointersRef.current.size === 2) {
      const [first, second] = Array.from(pointersRef.current.values());
      pinchRef.current = {
        distance: distanceBetweenPointers(first, second),
        scale: camera.camera.scale
      };
      dragRef.current.moved = true;
      suppressClickRef.current = true;
      event.currentTarget.classList.add("is-dragging");
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [first, second] = Array.from(pointersRef.current.values());
      const distance = distanceBetweenPointers(first, second);
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      camera.zoomAt(
        centerX,
        centerY,
        pinchRef.current.scale * (distance / pinchRef.current.distance)
      );
      return;
    }

    if (dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const totalDistance = Math.hypot(
      event.clientX - dragRef.current.start.x,
      event.clientY - dragRef.current.start.y
    );

    if (!dragRef.current.dragging && totalDistance >= DRAG_THRESHOLD) {
      dragRef.current.dragging = true;
      dragRef.current.moved = true;
      suppressClickRef.current = true;
      event.currentTarget.classList.add("is-dragging");
    }

    if (!dragRef.current.dragging) {
      return;
    }

    const deltaX = event.clientX - dragRef.current.last.x;
    const deltaY = event.clientY - dragRef.current.last.y;
    dragRef.current.last = { x: event.clientX, y: event.clientY };
    camera.panBy(deltaX, deltaY);
    spawnEnergyTrail(event.clientX, event.clientY, deltaX, deltaY);
  };

  const stopPointer = (event: PointerEvent<HTMLDivElement>) => {
    const didMove = dragRef.current.moved;
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;

    if (pointersRef.current.size === 0) {
      event.currentTarget.classList.remove("is-dragging");
      dragRef.current = { ...initialDragState };
    }

    if (
      event.pointerType === "touch" &&
      !didMove &&
      pointersRef.current.size === 0
    ) {
      const previousTap = lastTapRef.current;
      const now = performance.now();
      const isDoubleTap =
        previousTap &&
        now - previousTap.at < 320 &&
        Math.hypot(
          event.clientX - previousTap.x,
          event.clientY - previousTap.y
        ) < 32;

      if (isDoubleTap) {
        resetCamera();
        lastTapRef.current = null;
      } else {
        lastTapRef.current = {
          at: now,
          x: event.clientX,
          y: event.clientY
        };
      }
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0012);
    camera.zoomAt(
      event.clientX,
      event.clientY,
      camera.camera.scale * factor
    );
  };

  const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    cancelPendingNavigationAndReset();
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
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
      }, 520);
    }

    window.setTimeout(() => {
      setActiveEffectSlug((current) =>
        current === topic.routeSlug ? null : current
      );
    }, 720);
  };

  const enterRoute = (topicSlug: string, route: string) => {
    setActiveEffectSlug(topicSlug);

    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current);
    }

    navigationTimerRef.current = window.setTimeout(() => {
      navigateTo(route);
      navigationTimerRef.current = null;
    }, 520);
  };

  const switchWorld = (nextWorldId: CareerWorldId) => {
    if (nextWorldId === world.id) {
      camera.travelTo(MATH_HUB_POSITION, hubScale, 560);
      return;
    }

    const nextWorld = findCareerWorld(nextWorldId);

    if (!nextWorld) {
      return;
    }

    camera.travelTo(MATH_HUB_POSITION, hubScale, 520);
    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current);
    }
    navigationTimerRef.current = window.setTimeout(() => {
      navigateTo(nextWorld.topics[0].route);
      navigationTimerRef.current = null;
    }, 460);
  };

  const transformStyle = {
    "--map-scale": camera.camera.scale,
    "--map-x": `${camera.camera.x}px`,
    "--map-y": `${camera.camera.y}px`
  } as CSSProperties;

  return (
    <section
      aria-label={`عالم المحاور ${world.id === "math" ? "الكمية" : "اللفظية"}`}
      className={`math-map-world learning-map-world learning-map-world-${world.id}`}
      data-traveling={camera.isTraveling ? "true" : "false"}
    >
      <div
        aria-label={`خريطة تفاعلية للعالم ${world.label}. اسحب للتحرك، استخدم عجلة الفأرة للتكبير، وانقر مرتين للعودة.`}
        className="math-map-viewport"
        data-cursor-environment={world.id}
        ref={viewportRef}
        role="application"
        tabIndex={0}
        onClickCapture={handleClickCapture}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onPointerCancel={stopPointer}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPointer}
        onWheel={handleWheel}
      >
        <div
          className={`math-map-stage ${
            camera.isTraveling ? "is-traveling" : ""
          }`}
          style={transformStyle}
        >
          <WorldBoundary worldId={world.id} />

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
                  320,
                  300,
                  28
                )}
                key={`hub-${station.topic.id}`}
                start={MATH_HUB_POSITION}
                startGap={trailGapForRectangle(
                  MATH_HUB_POSITION,
                  station.position,
                  300,
                  300,
                  28
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
                    320,
                    300
                  )}
                  key={`ring-${station.topic.id}`}
                  start={station.position}
                  startGap={trailGapForRectangle(
                    station.position,
                    nextStation.position,
                    320,
                    300
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
            world={world}
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
                  enterRoute(station.topic.routeSlug, route)
                }
                onFocus={() => focusTopic(station.topic)}
                onHover={(isHovering) =>
                  setHoveredTopicSlug(
                    isHovering ? station.topic.routeSlug : null
                  )
                }
                onResetGesture={cancelPendingNavigationAndReset}
                position={{ x: 0, y: 0 }}
                topic={station.topic}
                worldId={world.id}
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
        <WorldSwitch activeWorld={world.id} onSwitch={switchWorld} />
        <p className="learning-world-hint">
          اسحب للاستكشاف · مرّر للتكبير · انقر مرتين للعودة
        </p>
      </div>
    </section>
  );
}
