type TargetGeometry = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

export type TourPanelPosition = {
  left: number;
  top: number;
  width: number;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

export const calculateTourPanelPosition = (
  target: TargetGeometry | null,
  viewportWidth: number,
  viewportHeight: number
): TourPanelPosition => {
  const edge = viewportWidth < 700 ? 10 : 18;
  const width = Math.min(viewportWidth - edge * 2, 430);

  if (viewportWidth < 700 || !target) {
    return {
      left: edge,
      top: Math.max(edge, viewportHeight - 298),
      width
    };
  }

  const gap = 22;
  const estimatedHeight = 282;
  const spaceBefore = target.left - edge;
  const spaceAfter = viewportWidth - target.right - edge;
  const hasSideSpace = Math.max(spaceBefore, spaceAfter) >= width + gap;
  let left = spaceBefore >= width + gap
    ? target.left - width - gap
    : target.right + gap;
  let top = target.top + target.height / 2 - estimatedHeight / 2;

  if (!hasSideSpace) {
    left = target.left + target.width / 2 - width / 2;
    const spaceBelow = viewportHeight - target.bottom - edge;
    top = spaceBelow >= estimatedHeight + gap
      ? target.bottom + gap
      : target.top - estimatedHeight - gap;
  }

  return {
    left: clamp(left, edge, viewportWidth - width - edge),
    top: clamp(
      top,
      edge,
      Math.max(edge, viewportHeight - estimatedHeight - edge)
    ),
    width
  };
};
