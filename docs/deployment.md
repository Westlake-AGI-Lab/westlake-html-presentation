# Deploying the current workspace

The reproducible current UI is launched from a source checkout with:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -e .
.venv/bin/python westlake.py demo courses --output /tmp/xiaoxi-workspace --port 8782
```

Open http://127.0.0.1:8782/. The output directory must be new or empty. The build combines the course catalog, supplied architecture lecture, editable samples, animated Linear Algebra lecture, classroom demo and presenter assets. Keep generated classroom data when starting a different preview. The generic `web/deck.html` is a generation template; serving it alone does not reproduce the course home.

## Internal server

Pushing to GitHub only updates source. No automatic server deployment is configured in this repository. The old service example targeted an obsolete standalone presentation and has been removed; it must not be installed to publish the current workspace.

Before sharing a persistent service, the administrator must inspect the actual service and storage layout, back up its code/configuration/data, prepare the current course build and a repeatable startup, preserve provider settings and security limits, and set a private non-demo teacher password. Do not point a service at the generic template or run the isolated `local-demo` classroom as a production classroom. The demo command is for reproducing the local UI, not a production deployment recipe.

Default serving remains localhost-only. Shared/internal hosting needs deliberate access restrictions; public hosting needs an explicit HTTPS/authentication design. Do not change the bind address alone. Keep credentials, private classroom state and generated output outside Git.

Only restart the application's own service when needed. Verify the catalog, all course links, full-page presenter previews, original PDF, classroom permissions and provider health after a deployment; restore the saved version if checks fail. Local tests do not establish remote deployment success. See [configuration](configuration.md), [testing](testing.md) and [deployment status](deployment-log.md).
