# Text-only evidence follow-up for the first release

Keep employer review and candidate replies usable without collecting media.

- Candidates can answer both questions and tasks with text using synthetic data.
- Existing text replies remain readable and legacy media-only replies can be answered again.
- The app does not request capture permissions, accept media files, or open the legacy media database.
- Verify the participant package and the employer-to-candidate browser journey before release.

## Release checks

1. Build the chosen source revision with Node 24 and the lockfile. Run
   `./scripts/verify` and generate the participant package into a fresh folder.
   Retain that package and the built static artifact under the source revision.
2. Before admitting participants, open the intended address in a fresh browser
   profile. With synthetic data, publish a job, submit an application, record
   an employer decision, and reload to check persistence. Check the written
   follow-up in both roles and repeat on a narrow screen with keyboard navigation.
3. Stop distribution if the main journey or persistence fails. For hosted
   delivery, restore the previous working static artifact at the same origin
   and recheck it before reopening. Preserve browser data while diagnosing.
   For local delivery, redistribute the previously verified participant package.
4. Confirm who receives reports during the session. Ask for the route, browser,
   and steps to reproduce, without application text or personal information.
   Agree how to handle a lost local scenario before the session.
