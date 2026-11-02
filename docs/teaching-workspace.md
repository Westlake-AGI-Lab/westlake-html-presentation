# Teaching workspace v1

The working app is in `/Users/sholpanamankeldy/Documents/ChatGPT/NAACL/westlake-html-presentation`; the older Desktop checkout is separate. The login HTML and existing student CSS remain unchanged. The teacher shell uses the course sidebar, palette, typography, tinted covers, card bodies and filters, plus a small responsive stylesheet.

## Setup and migration

Install `requirements.txt`, including Argon2 and PyMuPDF. Install LibreOffice for PPTX conversion, and put `soffice` on PATH or set `LIBREOFFICE_BIN` to its absolute executable. Set `WORKSPACE_AUTH_DB` outside the web root. Back up the private SQLite database and `lecture-files/` together before upgrading. Starting the teaching service idempotently adds schema v2 tables to the existing account database; accounts, password hashes and sessions are preserved. To explicitly import the existing JSON catalog and assign it to demo account 202400000:

```sh
PYTHONPATH=src python3 -m westlake_ppt.teaching --db /absolute/private/accounts.sqlite3 --web /absolute/project/web --seed-demo
```

Add `--mock-events` only for development. It inserts clearly marked fictional activity, idempotently; it is never run automatically in production. The account must already exist as a teacher (seed accounts with the existing `westlake_ppt.auth` command). Import preserves existing lecture edits and publishing state. No instructor is automatically granted other instructors' courses. New courses belong only to their creator. Use the same `WORKSPACE_AUTH_DB` at startup. The current local demo uses durable private data under `~/.local/share/xiaoxi-workspace/`, replacing the earlier temporary directory.

## Routes and models

- `/teacher`: name greeting, top five slides by questions in 14 days, ten anonymized recent actions, and owned course cards.
- `/teacher/courses`: search, subject filters and a new-course form.
- `/teacher/courses/:course`: lectures and placeholder Insights / AI / Practice / Students tabs.
- `/teacher/courses/:course/lectures/:lecture`: the existing reader in a same-origin read-only frame, heat strip, current-slide questions, collapsible answers, saved incorrect-answer flags and student-visible slide notes.
- `/teacher/students` and `/teacher/discussions`: Coming soon.

SQLite tables: `teaching_courses` (existing course metadata JSON), `course_owners` (many-to-many), `teaching_lectures` (existing lecture/slide JSON plus status, publish_at and position), `slide_notes`, `study_events` (account ID, course, lecture, slide, action, timestamp, question, answer, mock marker), `answer_flags` and `lecture_versions` (snapshots on replacement). Existing classroom events are class-interaction records, and existing browser-local chat/progress is not a reliable persisted per-course question log; neither is relabeled or backfilled as this new activity stream.

Teacher GET APIs: `today`, `courses`, `lecture?course=...&lecture=...`. POST APIs: `new-course`, `status`, `rename`, `reorder`, `note`, `flag`, `delete`, and binary `upload?course=...&replace=...` under `/api/teacher/`. JSON mutations include `course` and, where applicable, `lecture`. Uploads send a percent-encoded `X-Filename`. `/api/study/open` accepts authenticated student slide opens. Accepted `/api/chat` questions are recorded before inference, and successful answers (streamed, operator non-streamed and university text mode) update that event server-side using the reader's course/lecture/slide context. Failed inferences leave the question counted with an empty answer, shown honestly as incomplete. All teacher requests re-read the live account record; course-specific requests require ownership. Draft/Hidden lectures are excluded from student catalog/reader APIs and file access, including registered legacy source images/PDFs. Private rendered files use `/api/lecture-file/:token/:file`, with the same authorization. Preview requires the owning teacher, disables edits/practice, and creates no events.

## Processing and publishing decisions

Uploads are processed synchronously in the request: the UI stays in a processing state, then offers retry on failure. Default upload limit is 40 MiB (`LECTURE_UPLOAD_MB`); at most 200 slides are accepted. PDF magic and PPTX package contents are validated, extracted control characters are removed, and all displayed text is escaped or assigned through textContent. Random storage directories are outside the public root. PPTX converts to PDF with an isolated LibreOffice profile and a 90-second timeout. PyMuPDF extracts text/first nonempty line titles and renders bounded-size WebP page images plus 240px thumbnails. Scanned/image-only pages can have empty text; there is no OCR or automatic image understanding. Presentation animations and media become static PDF output. Conversion requires local fonts/LibreOffice; fidelity may differ from PowerPoint.

New uploads are Draft. Publish exposes them; Unpublish returns to Draft; Hide removes them from students. Optional scheduling accepts a timezone-qualified ISO timestamp. Due schedules are applied on the next catalog, reader or file authorization request; no scheduler daemon is required. Reordering supports drag/drop and keyboard-accessible Move up/down actions. Replacement resets the lecture to Draft and archives the prior lecture, notes, questions and flags, preserving old files privately; the new slide set begins with no misleading old counts or notes. There is no version-restoration UI. Delete asks for confirmation, removes the current lecture/activity/notes/flags and current uploaded files. Prior archived replacement versions remain in private storage for operator recovery. Supplied original source assets are never deleted.

## Privacy and scope

`TEACHING_ANONYMIZED=1` by default omits student identifiers from teacher activity responses. Setting it to `0` allows account IDs in question responses; student names are never returned or rendered. This is an operator decision, with no in-app identity toggle. Events now persist questions and successful AI answers in the private database for course owners; no retention deadline is imposed automatically. There is no export, grading, student management, risk list, discussion moderation, prompt editor or full analytics dashboard. Legacy classroom login and university Private Token connections remain separate. Existing browser-local progress/chat history remains browser-local and is not imported into this server log. Local/internal deployment defaults and security limits are preserved; no public deployment is implied.

## Validation

`python3 -m unittest discover -s tests -p test_teaching.py -v` exercises ownership, HTTP page/API/file checks, publish/hide flow, per-slide events/counts, streamed and non-streamed mocked AI logging, preview exclusion, notes/flags, upload success/failure, scheduling, ordering, replacement archives and idempotent seeds. Existing authentication and course regression suites are also run. A real PPTX fixture is converted through LibreOffice separately; no live provider inference is used. Browser verification covers Today, courses, lecture rows, heat jumps, file-picker upload/processing, a generated PDF page, publishing, saved notes, student reading and EN/中文. Internal Diffusion deployment remains pending if SSH cannot connect; do not replace its standalone deck with this repository's generic deck.
