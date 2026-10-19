# Current verification

The current course workspace is tested locally; this document does not establish internal-server deployment or real-model quality.

- Python: 63 tests cover the server, classroom, quiz, practice, course routing, registered source assets, PDF hash and isolated storage/context.
- Unit checks: browser archive handling, bilingual UI and eigenvector geometry have Node tests.
- `tests/test_courses.cjs`: desktop/mobile course cards, search, filters, lecture dialogs, HTML editing/text highlights, navigation, math, isolated mocked AI context, original Linear Algebra lecture/quiz and language persistence.
- `tests/test_source_lecture.cjs`: all 24 original pages, contents/search, zoom/page entry, personal caption/note/region-mark persistence and undo, original PDF SHA-256, mocked text-only AI, focus, language, presenter navigation and print styles.
- `tests/test_presenter_workspace.cjs`: complete PDF/sample preview bounds at 1360×880, 1024×600 and 390×844, independence from audience zoom/size, linked navigation/jump, timer, language and ending the presenter session.
- `tests/test_presentation_browser.cjs`: portable pairing, message validation, editing sanitation, media controls, print preparation, route/backup navigation and classroom permissions.

No paid provider calls, physical-phone/display/printing tests or validated educational outcomes are asserted for this release. Lecture figures, credits and original PDFs are preserved; PDF animations remain static frames. Browser edits do not modify repository source files. Reproduce commands in [testing](../docs/testing.md).

Release checkout check (2026-10-19): the exact staged source was exported to a clean temporary directory. All 63 Python and 7 Node unit checks passed. Catalog, source-lecture, presenter-workspace and quiz/report browser suites passed against a server built from that clean copy. The Quiz layout test explicitly opens /deck.html because / is now the catalog. No provider calls were made. The macOS launcher passed zsh syntax checking; GUI double-click was not exercised.
