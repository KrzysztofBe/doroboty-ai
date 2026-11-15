# PostHog pageviews

Send anonymous pageviews from the prototype to the configured PostHog project.

Acceptance criteria:
- Capture the initial public route and subsequent public route changes.
- Send fixed route labels without query strings, form contents, or workspace activity.
- Leave collection off when the deployment has no PostHog configuration.
- Verify event delivery on Vercel before disabling Vercel Web Analytics.

Set `VITE_POSTHOG_PROJECT_TOKEN` to the public project token and
`VITE_POSTHOG_HOST` to `https://eu.i.posthog.com` or `https://us.i.posthog.com`
in the target Vercel environment, then rebuild.
