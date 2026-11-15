# Serialize public demo writes across tabs

Use a browser lock around the comparison and write of the scenario snapshot.
A stale tab must retain its edits for export. Browsers without the lock API
keep edits in memory. Verify competing writes and reset in Chromium. Explain
that the roles are simulated and what the application reset clears.
