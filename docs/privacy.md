# Privacy And Security

The public repository must contain no credentials, classroom databases, student datasets or private Diffusion deck. `data/` is ignored except its README; all `results/` directories are ignored. Ignore rules are safeguards, not permission to force-add private files.

AI requests go to the configured provider with `store: false`; this does not establish a provider-wide retention guarantee. The application does not persist AI chats by default. Browser archives, teacher question sharing, concept summaries and research metadata have separate opt-in flows. Shared browser profiles can access locally saved records.

Current research events contain metadata rather than raw responses. Preparing a response dataset is a separate consented workflow. The offline dataset validator checks declared consent, de-identification and approval/exemption references; it does not verify consent or scrub personal information. Public release requires separate permission.

Default serving is loopback-only. The internal service example is trusted-LAN HTTP, not public hosting. Public use requires an explicit HTTPS/authentication/access-control design. Classroom state and rate limits remain single-process. Existing session/record expiry, deletion and withdrawal behavior is unchanged.
