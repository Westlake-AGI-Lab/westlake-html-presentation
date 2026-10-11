# Research Direction And Supervisor Issues

Primary direction: [Using lecture slides to check whether students actually understand, issue #1](https://github.com/Westlake-AGI-Lab/westlake-html-presentation/issues/1). The supplied follow-up requests reproducible experiments and repository reorganization. Pasted related-work references and comparative claims have not yet been independently verified.

## Implemented Foundation

- Teacher-editable source-grounded concepts and explanation/application/counterexample questions.
- Written attempts, criterion-level evidence, explicit uncertainty, two staged hints and explanation gating.
- Optional local concept records and consented teacher summaries, with separate research metadata controls.
- Python package/CLI, external versioned prompts, reusable model transport, existing tests behind one command, and isolated web assets.
- An offline dataset validator/builder and a first agreement experiment: two annotators, adjudicated labels, supplied model predictions, kappa, confusion counts, abstentions and false-understood errors.

## Still Required For The Study

The eigenvector demo uses an offline uncertain assessor. It is not real-model evaluation. A prediction-generation experiment must capture the actual provider/model, prompt hashes, source/question versions, request settings, latency and cost; the current agreement experiment consumes already supplied labels and does not establish that provenance.

Recruit two instructors/TAs to review source material and independently annotate question quality, conceptual understanding and misconceptions. Ten English-speaking CS/AI students are available according to project planning, but no completed study or annotation set is claimed. Record human disagreements before adjudication. Develop a concept-specific misconception inventory; current criterion labels are not a validated misconception taxonomy.

Add question-quality evaluation for conceptual demand, grounding and clarity; hint evaluation for early answer disclosure and helpfulness; and comparisons with the original prompt-only quiz and selected models. Fixed teacher-reviewed hints reduce open-ended generation but do not prove absence of answer leakage. References such as ICAP, testing/self-explanation research, MathDial and tutor evaluation frameworks need bibliographic and applicability checks before citing them.

Only after component checks and the applicable ethics/consent process should a student pilot compare direct explanations with guided understanding checks. Use held-out transfer questions, counterbalanced assignment where feasible, effort/frustration measures and an optional delayed test. Report the small sample honestly. Separate practice exposure from independent assessment; no causal efficacy or calibrated mastery claims follow from this prototype.

## Privacy And Reproducibility

Dataset collection is not turned on by reorganizing the repo. It never scrapes private chats. Human dataset rows require explicit declarations of consent, de-identification and an approval/exemption reference; these declarations are not automatically verified. Public release consent is separate.

Each experiment has a shallow folder with a config, a script and a short README. Outputs are ignored and store aggregate metrics plus provenance hashes. Synthetic smoke tests are labeled and cannot be used as research results. See [assessment agreement](../experiments/assessment_agreement/README.md), [private data](../data/README.md) and [demo readiness](DEMO_READINESS.md).

## Architectural Principles

DRY: shared prompt loading, configuration and validation. Separation of concerns: HTTP, transport, domain state and research tooling are separate. Small contracts: generation callbacks and named prompt resources. KISS/YAGNI: retain the standard-library server and existing Node browser tests; do not add distributed infrastructure without a deployment need. Observability: keep privacy-preserving request logs and reproducible experiment manifests. Scalability remains an explicit limitation because SQLite and memory sessions are stateful.
