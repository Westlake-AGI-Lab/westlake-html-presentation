# Assessment Agreement

Tests whether two human annotators agree and how supplied model labels compare with an independently adjudicated label. No model is called by this experiment.

Run `python3 westlake.py eval assessment_agreement --smoke` to check plumbing with synthetic fixtures. For a real run, prepare `data/assessment.jsonl`, validate it with `python3 westlake.py dataset validate --input data/assessment.jsonl`, then run `python3 westlake.py eval assessment_agreement`.

Each JSONL row has: `id`, `concept_id`, `language` (`en`/`zh`), `kind` (`explain`/`apply`/`counterexample`/`recall`), `question`, `answer`, `source` (`deck_id`, source `revision`, positive `page`, `quote`), `labels` (`annotator_a`, `annotator_b`, `adjudicated`, optional `model`), and `provenance`.

Human labels are `understood`, `partial`, or `misunderstood`. Model labels additionally allow `uncertain`. Provenance declares `synthetic`; human records also require `consent: true`, `deidentified: true`, and a nonempty `ethics_reference` for approval/exemption. These are recorded attestations, not automatic consent verification or automatic de-identification. The dataset validator checks structure, not source truth or educational validity.

Ignored `results/assessment_agreement/RUN_ID/` contains aggregate `metrics.json` and a `manifest.json` with commit, dirty-worktree status, config/script hashes and prompt inventory. Metrics include Cohen's kappa, confusion counts, coverage, abstentions and false-understood counts with their denominator. Undefined kappa is `null`. Model agreement excludes abstentions and must be read together with coverage. The inventory records the current prompts, not the unknown prompts that produced supplied predictions. Archive actual prediction-generation provenance separately before using results in a paper.

Raw answers and identifiers are not copied into result files. Separate fluent-but-wrong cases in the input annotation protocol; the current false-understood count does not identify fluency automatically.
