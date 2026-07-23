import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  MATH_WORLD_SIZE,
  type WorldPoint
} from "./mathWorldLayout";

type CameraState = {
  scale: number;
  x: number;
  y: number;
};

const clamp = (value: number, minimum: number, maximum: number) => {
  return Math.min(Math.max(value, minimum), maximum);
};

export function useMapCamera(
  viewportRef: RefObject<HTMLDivElement | null>
) {
  const [camera, setCamera] = useState<CameraState>({
    scale: 0.8,
    x: 0,
    y: 0
  });
  const [isTraveling, setIsTraveling] = useState(false);
  const [viewportSize, setViewportSize] = useState({ height: 0, width: 0 });
  const travelTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({
        height: entry.contentRect.height,
        width: entry.contentRect.width
      });
    });

    observer.observe(viewport);

    return () => observer.disconnect();
  }, [viewportRef]);

  useEffect(() => {
    return () => {
      if (travelTimerRef.current !== null) {
        window.clearTimeout(travelTimerRef.current);
      }
    };
  }, []);

  const clampCamera = useCallback(
    (nextCamera: CameraState) => {
      const edge = Math.min(180, Math.max(viewportSize.width * 0.24, 80));
      const scaledWidth = MATH_WORLD_SIZE.width * nextCamera.scale;
      const scaledHeight = MATH_WORLD_SIZE.height * nextCamera.scale;
      const minimumX = Math.min(edge, viewportSize.width - scaledWidth - edge);
      const minimumY = Math.min(edge, viewportSize.height - scaledHeight - edge);

      return {
        ...nextCamera,
        x: clamp(nextCamera.x, minimumX, edge),
        y: clamp(nextCamera.y, minimumY, edge)
      };
    },
    [viewportSize.height, viewportSize.width]
  );

  const cameraForPoint = useCallback(
    (point: WorldPoint, scale: number) => {
      return clampCamera({
        scale,
        x: viewportSize.width / 2 - point.x * scale,
        y: viewportSize.height / 2 - point.y * scale
      });
    },
    [clampCamera, viewportSize.height, viewportSize.width]
  );

  const jumpTo = useCallback(
    (point: WorldPoint, scale: number) => {
      setIsTraveling(false);
      setCamera(cameraForPoint(point, scale));
    },
    [cameraForPoint]
  );

  const travelTo = useCallback(
    (point: WorldPoint, scale: number, duration = 760) => {
      if (travelTimerRef.current !== null) {
        window.clearTimeout(travelTimerRef.current);
      }

      setIsTraveling(true);
      setCamera(cameraForPoint(point, scale));
      travelTimerRef.current = window.setTimeout(() => {
        setIsTraveling(false);
        travelTimerRef.current = null;
      }, duration);
    },
    [cameraForPoint]
  );

  const panBy = useCallback(
    (deltaX: number, deltaY: number) => {
      setIsTraveling(false);
      setCamera((current) =>
        clampCamera({
          ...current,
          x: current.x + deltaX,
          y: current.y + deltaY
        })
      );
    },
    [clampCamera]
  );

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = viewportRef.current?.getBoundingClientRect();

      if (!rect) {
        return { x: 0, y: 0 };
      }

      return {
        x: (clientX - rect.left - camera.x) / camera.scale,
        y: (clientY - rect.top - camera.y) / camera.scale
      };
    },
    [camera.scale, camera.x, camera.y, viewportRef]
  );

  return {
    camera,
    isReady: viewportSize.width > 0 && viewportSize.height > 0,
    isTraveling,
    jumpTo,
    panBy,
    screenToWorld,
    travelTo,
    viewportSize
  };
}
