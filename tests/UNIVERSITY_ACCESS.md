# University access verification — 2026-11-01

Actual source: `/Users/sholpanamankeldy/Documents/ChatGPT/NAACL/westlake-html-presentation`.
Actual demo: `http://127.0.0.1:8784/courses.html`, generated root `/tmp/xiaoxi-courses-preview-20261101`.
The Desktop checkout contains unrelated existing work and was not the running source.

`PYTHONPATH=src PPT_AI_MODE=operator python3 -m unittest discover -s tests -p 'test_*.py'`: 89 tests, 87 passed, 2 existing skips. University HTTP tests force university mode independently of the legacy test environment. Python and changed JavaScript syntax checks and `git diff --check` passed.

New coverage (`test_university.py`): separate and concurrent student requests; missing/expired/disconnected/invalid-token sessions; session concurrency; no shared-key fallback; exact endpoint, Bearer auth, model alias and Chat Completions request shape; successful credential-echo redaction and error-body suppression; current slide only; provider authorization, quota, timeout, network, incomplete response and format errors; unsupported images; same-origin/body limits; Secure cookies for configured HTTPS and localhost behavior.

Browser checks used the actual port-8784 application with a temporary, explicitly mocked university transport and fake test-only values. The mock was not application configuration; it was removed after QA. The running demo was restarted with real university transport, confirmed disconnected, and its unauthenticated chat endpoint returned 401 without invoking a provider. English/Chinese guidance, masking and disabled images were checked again. Passed: credential-free course/lecture browsing; question retained before connection and after rejected connection; keyboard Tab/Space visibility toggle and Enter Connect; documented aliases selectable; successful probe clears token input and does not submit the draft; explicit question gets mock inference; switching to slide 2 updates captured upstream context and follow-up without reconnect; disconnect returns to token input; 390×844 mobile layout, all controls reachable, no document horizontal overflow. Existing lecture content and assets were preserved. This checks interaction behavior, not real provider quality or physical-phone behavior.

Provider evidence: university HPC manual `https://hpc.westlake.edu.cn/document/science/soft/more/ai.html` documents `https://hpc-api.westlake.edu.cn/v1`, `deepseek-flash`, `glm-flash`, `Qwen` and an OpenAI-compatible client configuration. A credential-free POST to the full Chat Completions endpoint returned 401, confirming route reachability/authentication gating only. No authorized real token was supplied or sought. Real text inference and model authorization remain pending. Real image inference is separately unverified and disabled; SSE compatibility is unverified, so university mode uses non-streaming JSON.

Internal deployment: SSH authentication denied; HTTP 200 was observed. Synchronization remains pending and no remote change was made. No HTTPS token entry has been provisioned on the LAN HTTP service. No commits or pushes.


## Model switching — 2026-11-01

Added POST /api/university/model and the connected Xiaoxi model selector. The session token is reused server-side; a completed real probe with max_tokens=16 gates activation. Probe failure retains the previous model/session, including invalid-token probe failures; expiry/disconnect during validation prevents activation. Session/global limits apply, with one shared active slot for chat and switching. No configuration changes.

Validation: 92 Python tests passed (2 existing skips), including 15 university tests; Python compilation, JavaScript syntax and diff whitespace checks passed. Browser QA on an isolated localhost:8786 instance used fake credentials and a mock transport: deepseek-flash → Qwen → rejected glm-flash → deepseek-flash; clear rejection error and prior model retained; draft/history retained; selector, submit and disconnect disabled while probing/chatting; next chat used Qwen. Final compact connected settings layout inspected at desktop width. Screenshot: /tmp/slidemate-model-switch.png (mock QA). Real credentialed university inference and physical mobile testing were not performed. Production probe uses real university transport.

Updated existing generated preview assets and restarted the real localhost:8784 server without regenerating lectures or changing private configuration/data. Restart expires existing process-memory university sessions; reconnect once after this update. Verified course/status routes and the new endpoint returning 401 without a session. No mock transport is installed on port 8784.

Internal deployment remains pending: SSH authentication to user@10.21.3.45 was denied; HTTP returned 200, which does not establish deployment of this update. No remote file, setting, credential, service or standalone Diffusion deck changed. No commit or push.
