# Experiments

Each experiment is one folder containing `README.md`, `config.json` and `run.py`.
Run it through `westlake-ppt eval NAME` (or `python3 westlake.py eval NAME`).
Outputs go to ignored `results/NAME/RUN_ID/`. Student data belongs only in ignored `data/`.

- `assessment_agreement`: agreement between two annotators; supplied model predictions versus adjudicated labels; abstention coverage and false-understood errors.

`--smoke` checks infrastructure with generated synthetic records. It is not a model or learning evaluation. This initial experiment consumes already generated predictions and makes no provider calls. Question-quality, hint-leakage and controlled student comparisons remain research work, tracked in `docs/research.md`.
