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

const interactionTypes = ["click", "change", "submit"] as const;
type InteractionType = (typeof interactionTypes)[number];

function interactionRoute(pathname: string) {
  const route = publicRoute(pathname);
  if (route) return route;
  if (/^\/auth\/[^/]+$/.test(pathname)) return "/auth/:mode";
  if (/^\/aplikuj\/[^/]+$/.test(pathname)) return "/aplikuj/:slug";
  if (pathname === "/app" || pathname.startsWith("/app/")) return "/app";
  return "/not-found";
}

function capture(event: "$pageview" | "$autocapture", route: string, interaction?: InteractionType) {
  if (!projectToken || !captureUrl) return;

  anonymousId ??= crypto.randomUUID();
  void fetch(captureUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    referrerPolicy: "no-referrer",
    keepalive: true,
    body: JSON.stringify({
      api_key: projectToken,
      event,
      properties: {
        distinct_id: anonymousId,
        ...(interaction ? { $event_type: interaction } : {}),
        $current_url: `${window.location.origin}/#${route}`,
        $process_person_profile: false,
      },
    }),
  }).catch(() => undefined);
}

export function Pageviews() {
  const { pathname } = useLocation();
  const previousPath = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;

    const route = publicRoute(pathname);
    if (!route) return;

    capture("$pageview", route);
  }, [pathname]);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root || !projectToken || !captureUrl) return;

    const route = interactionRoute(pathname);
    const listeners = interactionTypes.map((type) => {
      const listener = () => capture("$autocapture", route, type);
      root.addEventListener(type, listener, true);
      return { type, listener };
    });

    return () => {
      for (const { type, listener } of listeners) {
        root.removeEventListener(type, listener, true);
      }
    };
  }, [pathname]);

  return null;
}
