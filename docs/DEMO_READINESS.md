# Demonstration Readiness

## Current Demonstration

The local English lecture contains 16 adapted slides, five source-linked practice concepts and interactive 2D geometry. It is a working interface demonstration, not evidence of educational effectiveness or validated model assessment. The eigenvector runner always returns uncertain assessment results. It makes no award or acceptance claim.

## Three-Minute Walkthrough

1. Open slide 9, projection. Choose a general vector, reset, then animate. The unit square collapses to a line. Pause and scrub to inspect the transition.
2. Choose the exact perpendicular direction. The input remains nonzero while its image is zero. Choose the direction along the line to contrast eigenvalues 0 and 1.
3. Open slide 10. Compare a quarter turn with a half turn. A negative eigenvalue reverses a direction without leaving its line. Rotation preserves length throughout the animation.
4. Open the source-linked question. Enter reasoning, request staged hints, revise and open the explanation. Explicitly identify offline assessment when using this runner.
5. Show optional browser records and separate consent controls. Demonstrate teacher summaries only in a joined classroom; do not claim that private answers are shared or that research has been approved.

## What Must Be Established Before Submission

- Model behavior: run an explicitly configured real provider on held-out student-like responses. Include correct reasoning, partial reasoning, plausible misconceptions, irrelevant responses and uncertainty. Record model/version, prompts, latency and cost. Do not use offline results as model evaluation.
- Educational validity: obtain independent review of concepts, criteria, explanations and hint leakage. A catalogue's published state is not evidence of independent expert review.
- Evidence: use the available ten CS/AI students for a consented, counterbalanced pilot with separate practice and transfer questions, subject to the institution's applicable ethics requirements. Report this small sample and avoid causal claims unsupported by the design.
- Reliability: rehearse from a clean checkout and browser profile, verify provider failure and timeout paths, and retain an explicitly labeled offline fallback. Record actual failures instead of hiding them in the demo video.
- Submission: align the paper, video and released implementation around the same completed workflow. Confirm the current official venue requirements separately. The paper should distinguish implemented behavior, tested behavior and planned behavior.

## Motion And Geometry Contract

- Rotation uses an angular path; it never introduces the artificial shortening caused by entrywise interpolation between rotation matrices.
- Projection and scaling interpolate from identity to the target. The intermediate map is labeled A(t), not the final A.
- Endpoint eigenvector feedback tests collinearity numerically, excludes the zero input vector and permits a nonzero vector with zero image.
- Sliders, presets and pointer input share one numerical state. Playback stops when its slide or browser tab becomes inactive. Idle diagrams do not run a continuous animation loop.
- Reduced-motion preferences suppress visual transitions and turn playback into an immediate application. Keyboard controls and visible numeric outputs remain available.

## Local Verification

Run `node --test tests/test_eigen_geometry.cjs` and the Python `test_eigen_demo.py` and `test_learning.py` suites. Browser checks must cover desktop and mobile, playback/pause/reset/scrubbing, exact projection presets, quarter/half turns, navigation during playback and direct question entry. These checks establish implementation behavior, not learning outcomes.
