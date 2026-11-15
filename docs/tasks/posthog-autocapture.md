# PostHog autocapture

Capture clicks, committed field changes, and form submissions across the prototype
using the existing PostHog configuration.

- Send one `$autocapture` event per supported DOM interaction inside the app root.
- Send the interaction type and a fixed route label. Exclude field values, DOM text,
  element attributes, URL parameters, and record identifiers.
- Preserve the existing public pageview scope and anonymous ID behavior.
