type TimingCarrier = {
  __perfStart?: number;
  __perfLabel?: string;
  method?: string;
  url?: string;
};

const timingFlag = (process.env.EXPO_PUBLIC_ENABLE_API_TIMING || '').trim().toLowerCase();
const thresholdFlag = Number(process.env.EXPO_PUBLIC_API_TIMING_THRESHOLD_MS || '300');
const slowRequestThresholdMs = Number.isFinite(thresholdFlag) && thresholdFlag >= 0
  ? thresholdFlag
  : 300;

export const isApiTimingEnabled =
  __DEV__ && (timingFlag === 'true' || timingFlag === '1' || timingFlag === 'yes');

export const startApiTiming = (config?: TimingCarrier | null): void => {
  if (!isApiTimingEnabled || !config) return;

  config.__perfStart = Date.now();
  config.__perfLabel = `${config.method?.toUpperCase() || 'GET'} ${config.url || ''}`.trim();
};

export const finishApiTiming = (
  config: TimingCarrier | null | undefined,
  outcome: string
): void => {
  if (!isApiTimingEnabled || !config?.__perfStart) return;

  const duration = Date.now() - config.__perfStart;
  if (duration < slowRequestThresholdMs) return;

  const label = config.__perfLabel || `${config.method?.toUpperCase() || 'GET'} ${config.url || ''}`.trim();
  console.log(`⏱️ [API PERF] ${label} - ${outcome} - ${duration}ms (threshold: ${slowRequestThresholdMs}ms)`);
};
