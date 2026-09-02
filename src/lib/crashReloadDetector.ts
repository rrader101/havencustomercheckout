/**
 * Detects a browser crash-reload loop on the checkout.
 *
 * When iOS Safari kills a tab (WebKit content process OOM) it silently reloads
 * the same URL; if the page dies again it retries until it gives up and shows
 * "A problem repeatedly occurred". None of that reaches analytics: no JS error
 * is thrown, and the event queue dies with the process. From PostHog the
 * session simply stops mid-checkout, which is indistinguishable from a customer
 * closing the tab — that is why these reports could only be reconstructed from
 * server access logs.
 *
 * sessionStorage survives a reload within the same tab, so we can spot the
 * pattern from the *next* page load: several mounts of the same checkout,
 * seconds apart. The event fires on the load AFTER the crash, so it always
 * lands one crash behind — which is fine, we only need to know it happened.
 *
 * Deliberately cause-agnostic: it reports "this page keeps reloading itself",
 * whatever the reason. A person mashing reload will also trip it, so the event
 * carries navigation_type and the gap timings to tell the two apart.
 */

const STORAGE_KEY = 'hc-checkout-mount-history';
/** Mounts within this window count toward the same suspected loop. */
const WINDOW_MS = 90_000;
/** Mounts inside WINDOW_MS before we call it suspicious. */
const MOUNT_THRESHOLD = 3;
/** Cap the retained history so a long session can't grow it without bound. */
const MAX_ENTRIES = 20;

interface MountEntry {
  /** epoch ms */
  t: number;
  /** checkout step at mount time */
  s: string;
  /** pathname, so two different deals don't pool their history */
  p: string;
}

export interface CrashLoopSignal {
  mountCount: number;
  windowSeconds: number;
  /** Gap to the previous mount — a crash-retry cadence is short and regular. */
  secondsSincePreviousMount: number;
  /** All gaps in the window, oldest first. */
  gapSeconds: number[];
  step: string;
  navigationType: string;
  environment: Record<string, unknown>;
}

const readHistory = (): MountEntry[] => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as MountEntry[]).filter((e) => e && typeof e.t === 'number') : [];
  } catch {
    // Private mode, storage disabled, or corrupt JSON — start clean.
    return [];
  }
};

const writeHistory = (entries: MountEntry[]): void => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // Non-fatal: without storage we simply can't detect the loop.
  }
};

/**
 * How the browser got here. A crash-retry reports "reload" in Safari, so this
 * separates a self-reloading tab from ordinary in-app navigation.
 */
const getNavigationType = (): string => {
  try {
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return entry?.type || 'unknown';
  } catch {
    return 'unknown';
  }
};

/**
 * Environment fields that help explain an OOM kill. Most are Chromium-only and
 * come back undefined on Safari; they're included because when they ARE present
 * they're decisive, and an absent key is harmless in PostHog.
 */
const describeEnvironment = (): Record<string, unknown> => {
  const nav = navigator as Navigator & { deviceMemory?: number; standalone?: boolean };
  const perf = performance as Performance & { memory?: { jsHeapSizeLimit: number; usedJSHeapSize: number } };
  const ua = navigator.userAgent || '';
  return {
    device_memory_gb: nav.deviceMemory,
    hardware_concurrency: nav.hardwareConcurrency,
    js_heap_limit_mb: perf.memory ? Math.round(perf.memory.jsHeapSizeLimit / 1048576) : undefined,
    js_heap_used_mb: perf.memory ? Math.round(perf.memory.usedJSHeapSize / 1048576) : undefined,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    // Best-effort only. Gmail/Facebook/Instagram webviews stamp the UA; the iOS
    // Mail in-app browser (SFSafariViewController) is indistinguishable from
    // Safari, so a false here does NOT mean "real Safari".
    in_app_browser_hint: /\b(GSA|FBAN|FBAV|Instagram|Line|Twitter)\b/i.test(ua) ? 'yes' : 'unknown',
    raw_user_agent: ua,
  };
};

/**
 * Record this page load and report whether it looks like a crash-reload loop.
 * Call once per mount of the checkout page. Returns null when nothing is
 * suspicious — which is the overwhelmingly common case.
 */
export const recordCheckoutMount = ({ step }: { step: string }): CrashLoopSignal | null => {
  if (typeof window === 'undefined') return null;

  const now = Date.now();
  const path = window.location.pathname;
  const history = readHistory().filter((entry) => entry.p === path && now - entry.t <= WINDOW_MS);
  const previous = history[history.length - 1];

  history.push({ t: now, s: step, p: path });
  writeHistory(history);

  if (history.length < MOUNT_THRESHOLD) return null;

  const gaps = history
    .slice(1)
    .map((entry, index) => Math.round(((entry.t - history[index].t) / 1000) * 10) / 10);

  return {
    mountCount: history.length,
    windowSeconds: Math.round((now - history[0].t) / 1000),
    secondsSincePreviousMount: previous ? Math.round(((now - previous.t) / 1000) * 10) / 10 : 0,
    gapSeconds: gaps,
    step,
    navigationType: getNavigationType(),
    environment: describeEnvironment(),
  };
};
