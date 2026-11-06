// Analytics stubs — wire real IDs via environment variables before deploy.
// See .env.example. Calls are no-ops until IDs are provided, so the build
// never breaks in dev or preview environments.

const GA_ID = import.meta.env.VITE_GA4_ID;
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  if (GA_ID) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA_ID);
  }

  if (PIXEL_ID) {
    /* eslint-disable */
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", PIXEL_ID);
    window.fbq("track", "PageView");
    /* eslint-enable */
  }
}

export function trackEvent(name, params = {}) {
  if (typeof window === "undefined") return;
  if (window.gtag) window.gtag("event", name, params);
  if (window.fbq) window.fbq("trackCustom", name, params);
}
