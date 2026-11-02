# Deployment status

## Current course workspace — 2026-10-19

The local workspace includes four course cards, seven teaching samples, the animated Linear Algebra lecture, display profile, annotations/notes/highlighting and the light presenter view with full-slide fitting. The launch command is `python3 westlake.py demo courses --output /tmp/xiaoxi-workspace --port 8782` with a new/empty output directory.

The owner requested publishing this current source version to GitHub. Obsolete presentation-specific service instructions and historical README snapshots are excluded from the current tree. Secrets, local agent/editor tools, classroom databases and generated preview directories are not release content.

The internal endpoint http://10.21.3.45:8765/ remains unverified and unavailable from this session. SSH has closed the connection or timed out before authentication, and HTTP has returned empty replies/timeouts. No remote file, credential, model setting or service has been changed. Internal synchronization remains pending; GitHub publication is separate from deployment.

## 2026-11-01 — University Private Token access

The port-8784 process was traced to `/Users/sholpanamankeldy/Documents/ChatGPT/NAACL/westlake-html-presentation`, serving `/tmp/xiaoxi-courses-preview-20261101`; the Desktop checkout was not the running source and its existing changes were left untouched. Only applicable assets were copied into the existing generated preview; its lecture/deck/private classroom files were not regenerated or replaced. The preview was restarted with the existing quiz and offline reviewed-bank behavior preserved.

Internal synchronization attempted: SSH `user@10.21.3.45` rejected authentication (`Permission denied (publickey,password)`). HTTP `http://10.21.3.45:8765/` responded 200, but that does not verify new code deployment. No remote files, credentials, model configuration, service, or standalone Diffusion deck were changed. Deployment is pending. Plain remote HTTP token entry is disabled in the new code; no HTTPS proxy was provisioned. The Diffusion example remains outside this repository/release outputs. No Git commit or push was made.

## 2026-11-01 — Chat and control styling

Updated the actual port8784 source's existing chat, legacy learning and Socratic frontend assets; synchronized those six assets into the existing generated local preview without regenerating lecture content or restarting the provider process. The Desktop checkout and existing server credentials/sessions were preserved. Internal synchronization was attempted again: SSH authentication to `user@10.21.3.45` was denied; `http://10.21.3.45:8765/` returned200. No remote file, service, settings or standalone Diffusion deck was changed. Deployment remains pending. No commit or push.


## 2026-11-01 — Xiaoxi model switching

Updated the actual Documents/ChatGPT/NAACL source and existing generated localhost:8784 chat asset. Restarted only the local demo backend, skipping generation to preserve existing lectures/data/settings. The restart expires in-memory student connections once; subsequent model switching reuses each connection's token. Verified the new endpoint's unauthenticated 401 and status route. Internal SSH synchronization failed authentication again; HTTP returned 200, but deployment of this change remains pending. No remote changes or Git commit/push.
