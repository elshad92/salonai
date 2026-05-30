// Plausible custom event tracker — silently no-ops if Plausible is not loaded.
export function trackEvent(name, props) {
  if (typeof window === "undefined" || typeof window.plausible !== "function") return;
  window.plausible(name, props ? { props } : undefined);
}

export function useAnalytics() {
  return { trackEvent };
}
