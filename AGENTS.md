# Project maintenance rules / 项目维护约定

- Every feature, API, configuration, startup, or limitation change must update both `README.md` (Chinese) and `README.en.md` (English) in the same change. Keep their technical content equivalent and examples aligned with code.
- 每次功能、接口、配置、启动方式或限制变化，都必须同步更新中英文 README；不得只更新其中一份。
- Update `使用说明.md` for user-facing workflow changes and `.env.example` for configuration changes. Never put real credentials in documentation, examples, HTML, repository files, or archives.
- Keep API credentials server-side. Preserve the local-only default; public deployment requires an explicit security design, not merely changing the bind address.
- Do not describe unimplemented capabilities as available. Distinguish text context from image understanding, browser-local edits from file edits, and local serving from public deployment.
- Verify changes proportionately: Python syntax, browser interactions for UI changes, and mock or explicitly authorized real API tests for proxy changes. Report what was and was not tested.
- Preserve user content and supplied brand assets. Do not add a license or claim official university authorization without the owner's direction.
- After every update, synchronize the applicable changes to the existing internal Diffusion deployment at `user@10.21.3.45:/home/user/apps/westlake-ppt` and verify the deployed result at `http://10.21.3.45:8765/`. Preserve server-side credentials, model settings, security limits, and unrelated services; restart only `westlake-ppt` when needed. Deploy the standalone Diffusion deck, never overwrite it with the generic template. Keep the Diffusion example outside this repository and release bundles. If connectivity or verification fails, explicitly report deployment as pending; do not claim success. This standing deployment instruction does not authorize automatic Git commits or pushes.
