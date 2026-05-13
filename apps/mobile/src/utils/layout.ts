/**
 * Responsive layout breakpoints for phone vs tablet (iPad, Android tablets).
 * Uses shortest window side so split-screen and Stage Manager behave sensibly.
 */

/** Minimum shortest side (pt) to treat as tablet layout */
export const TABLET_MIN_SHORT_SIDE = 600;

/** Large tablet / two-pane friendly */
export const LARGE_TABLET_MIN_SHORT_SIDE = 900;

/**
 * Max content width when shortest side is tablet-sized (e.g. iPad 10–11", split view).
 * Keeps single-column UIs readable without looking like a stretched phone layout.
 */
export const TABLET_MAX_CONTENT_WIDTH = 880;

/**
 * Max content width on large tablets (iPad Pro 12.9" / 13" class, landscape).
 * Tuned for App Store screenshot devices and comfortable reading width.
 */
export const TABLET_MAX_CONTENT_WIDTH_LARGE = 1100;

/** @deprecated Use TABLET_MAX_CONTENT_WIDTH — kept for existing imports */
export const FEED_MAX_CONTENT_WIDTH = TABLET_MAX_CONTENT_WIDTH;

/** Fixed width for the tablet primary tab rail */
export const TABLET_TAB_RAIL_WIDTH = 76;

export type LayoutBreakpoint = {
  width: number;
  height: number;
  shortestSide: number;
  longestSide: number;
  isCompact: boolean;
  isTablet: boolean;
  isLargeTablet: boolean;
  /** Logical column width for layouts (min of window width and tablet cap) */
  contentColumnWidth: number;
};

export function getLayoutBreakpoint(width: number, height: number): LayoutBreakpoint {
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);
  const isTablet = shortestSide >= TABLET_MIN_SHORT_SIDE;
  const isLargeTablet = shortestSide >= LARGE_TABLET_MIN_SHORT_SIDE;
  const isCompact = !isTablet;
  const cap = isLargeTablet
    ? TABLET_MAX_CONTENT_WIDTH_LARGE
    : isTablet
      ? TABLET_MAX_CONTENT_WIDTH
      : width;
  const contentColumnWidth = isTablet ? Math.min(width, cap) : width;

  return {
    width,
    height,
    shortestSide,
    longestSide,
    isCompact,
    isTablet,
    isLargeTablet,
    contentColumnWidth,
  };
}

/** Merge into native-stack `contentStyle` / bottom-tabs `sceneContainerStyle` on tablet */
export function getTabletSceneStyle(layout: LayoutBreakpoint): {
  maxWidth: number;
  width: '100%';
  alignSelf: 'center';
  flex: 1;
} | undefined {
  if (!layout.isTablet) return undefined;
  const maxWidth = layout.isLargeTablet ? TABLET_MAX_CONTENT_WIDTH_LARGE : TABLET_MAX_CONTENT_WIDTH;
  return { flex: 1, width: '100%', maxWidth, alignSelf: 'center' };
}
