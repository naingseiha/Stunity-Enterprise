import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { getLayoutBreakpoint, type LayoutBreakpoint } from '@/utils/layout';

/**
 * Live layout breakpoint from window size (updates on rotation / split view).
 */
export function useLayoutBreakpoint(): LayoutBreakpoint {
  const { width, height } = useWindowDimensions();

  return useMemo(
    () => getLayoutBreakpoint(width, height),
    [width, height],
  );
}
