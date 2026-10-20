# Privacy And Security

The public repository must contain no credentials, classroom databases or private student response datasets. `data/` is ignored except its README; all `results/` directories are ignored. Ignore rules are safeguards, not permission to force-add private files.

AI requests go to the configured provider with `store: false`; this does not establish a provider-wide retention guarantee. The application does not persist AI chats by default. Browser archives, teacher question sharing, concept summaries and research metadata have separate opt-in flows. Shared browser profiles can access locally saved records.

Current research events contain metadata rather than raw responses. Preparing a response dataset is a separate consented workflow. The offline dataset validator checks declared consent, de-identification and approval/exemption references; it does not verify consent or scrub personal information. Public release requires separate permission.

Default serving is loopback-only. The internal service example is trusted-LAN HTTP, not public hosting. Public use requires an explicit HTTPS/authentication/access-control design. Classroom state and rate limits remain single-process. Existing session/record expiry, deletion and withdrawal behavior is unchanged.

My progress stores browser-local active subject time and selected highlight snippets/region references. Pause tracking and time-only deletion are available. Discussions stores only explicitly published selected content in localStorage; full private histories and attachments are never automatically copied. Agent drafts stay in page memory until individually approved. Sample participants and scripted agents are identified. Visibility controls are prototype metadata, not access enforcement. Neither feature is isolated between people using the same browser profile; neither uploads records to a multi-user service.

The optional C++ runner passes source and stdin into a WASI virtual filesystem without server provider keys, private environment variables, host files or guest network capabilities. It is disabled by default and accepts only same-origin localhost execution requests.
