# Privacy And Security

The public repository must contain no credentials, classroom databases or private student response datasets. `data/` is ignored except its README; all `results/` directories are ignored. Ignore rules are safeguards, not permission to force-add private files.

AI requests go to the configured provider with `store: false`; this does not establish a provider-wide retention guarantee. The application does not persist AI chats by default. Browser archives, teacher question sharing, concept summaries and research metadata have separate opt-in flows. Shared browser profiles can access locally saved records.

Current research events contain metadata rather than raw responses. Preparing a response dataset is a separate consented workflow. The offline dataset validator checks declared consent, de-identification and approval/exemption references; it does not verify consent or scrub personal information. Public release requires separate permission.

Default serving is loopback-only. The internal service example is trusted-LAN HTTP, not public hosting. Public use requires an explicit HTTPS/authentication/access-control design. Classroom state and rate limits remain single-process. Existing session/record expiry, deletion and withdrawal behavior is unchanged.

My progress is a browser-local activity feature, independent of classroom/research records. It stores daily subject durations and selected-highlight snippets/region references in localStorage. It does not upload progress, infer grades or identify a signed-in student. Tracking is pausable; time-history deletion retains source slide highlights/notes. Shared browser profiles can access this data. It is scoped to the browser origin and has no automatic cross-device transfer.


## Visual Socratic practice

Starting visual practice explicitly sends the selected slide pixels and text to the configured server-side provider. Subsequent assessments send that frozen snapshot and this practice dialogue. Provider retention is governed by that provider; requests use `store: false`. Server sessions contain pixels, private rubrics and dialogue in bounded process memory for 30 minutes, cleared on a later start request or restart; no practice dialogue is written to the classroom database. Text saving is opt-in in a separate browser key `slidemate-socratic-records-v1`, capped at 100 records. It excludes pixels, private rubrics and worked answers. Selected student turns may be brought into the existing discussion composer only through an explicit sharing action and publication confirmation. Existing browser records are not migrated, cleared or uploaded by this feature.
