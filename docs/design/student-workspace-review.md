# Student interface review — 2026-11-01

Active target: 8784 courses preview generated from this NAACL checkout. Initial critique used two independent source/browser assessments. Before: real-looking hardcoded learner identity, three focus stops per course, blank cover space, duplicate shell title, weak filter state, mixed icons, inaccessible mobile demo entry and a missing student route. Heuristic assessment: 25/40 (provisional). Questions skipped because the user specified the complete implementation scope and pinned the visual system.

Direction: Editorial greeting, seed 48517257, palette/type kept and user-prescribed pastels, eyebrows, soft shadows and radii honored. No redraw. Course covers become an index of actual lecture counts and browser-local activity. Empty records remain empty. The whole-card lecture opener is the live interaction; the vector toggle and scripted dialogue are local demo fixtures, not research evidence or live agents. Inter is bundled offline with its upstream OFL attribution; Westlake/character assets were preserved. No generated or stock media was added.

Final source/browser checks: all four sizes pass workflow tests; catalog and login inspector each 0 FAIL with named `micro-label` and login `heavy-shadow` exceptions for the explicit brief. Remaining warnings concern small secondary metadata and the deliberately larger entry title. The inspector recognized Inter on every screen. Desktop uses a restrained two-column library; phones stack cards and retain all navigation. Every real course card has one keyboard action. Counts derive from catalog/local records. First-entry proof is fictional identity and explicit demo access.

Independent finish review initially requested one fix: remove discussions.css's obsolete 160px navigation width. That fix was applied; 390/360px navigation is now legible and all four sizes were recaptured. A final detector contrast finding on the student footer was corrected to the pinned muted token. Subjective final assessment: hierarchy 8/10, brand coherence 8/10, legibility 8/10, responsive composition 8/10. These are design judgments, not measured educational outcomes.

## Motion quality

| Before | After | Why |
| --- | --- | --- |
| Abrupt workspace entry and progress | Brief 240ms transform/opacity feedback and 50ms entry stagger | Makes state changes legible |
| Independently animated geometry risk | Complete geometry changes with a finite fade | Keeps vector and projection consistent |
| Large mascot intercepted highlighter close control | Smaller mascot yields while highlight/marking tools are open | Keeps study controls operable |
| Weak keyboard/reduced-motion distinction | Keyboard actions immediate; reduced motion removes travel | Avoids interaction delay and unnecessary movement |

Source uses CSS/WAAPI, shared strong easing tokens, finite local-feedback dots and no artificial model-wait delay. Device frame pacing and screen-reader behavior were not tested. Existing unrelated working-tree edits were preserved. No commit, push, release bundle or server credential changes were made. Required internal deployment remains pending because SSH authentication failed; HTTP 200 describes the existing site only.

Final reviewer verdict: **Ship**. The reviewer visually verified the corrected 390px and 360px Discussions navigation and found the requested fix resolved. Final generated preview files match their source; the footer uses the pinned muted color at all four widths.

## Superseding scope — login and courses only

The user rejected the intermediate workspace. It and its SlideMate/integration UI are now removed; Progress and Discussions links are absent from the two retained screens. Demo validation opens courses directly. The earlier lab review is historical. The updated two-screen browser regression passed all four widths. Internal deployment remains pending after SSH timed out.
