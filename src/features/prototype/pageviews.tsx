import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

const projectToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;
const host = import.meta.env.VITE_POSTHOG_HOST;
const captureUrl =
  host === "https://eu.i.posthog.com" || host === "https://us.i.posthog.com"
    ? `${host}/i/v0/e/`
    : undefined;

function publicRoute(pathname: string) {
  if (["/", "/oferty", "/metodologia", "/polityka-prywatnosci"].includes(pathname)) {
    return pathname;
  }
  if (/^\/oferty\/[^/]+$/.test(pathname)) return "/oferty/:slug";
  if (/^\/firmy\/[^/]+$/.test(pathname)) return "/firmy/:slug";
  return null;
}

let anonymousId: string | undefined;

export function Pageviews() {
  const { pathname } = useLocation();
  const previousPath = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;

    const route = publicRoute(pathname);
    if (!route || !projectToken || !captureUrl) return;

    anonymousId ??= crypto.randomUUID();
    void fetch(captureUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      referrerPolicy: "no-referrer",
      keepalive: true,
      body: JSON.stringify({
        api_key: projectToken,
        event: "$pageview",
        properties: {
          distinct_id: anonymousId,
          $current_url: `${window.location.origin}/#${route}`,
          $process_person_profile: false,
        },
      }),
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
