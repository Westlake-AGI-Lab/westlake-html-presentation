# Deployment And Migration

The current work is a local preview. Updating the service example does not mean the internal host has been migrated.

The systemd example now executes `python -m westlake_ppt serve`, with `PYTHONPATH` pointing to the deployed `src/`. It explicitly selects the existing deployment directory, its original Chinese-named private Diffusion deck and the prior deck ID `westlake-ppt`. This avoids replacing the private lecture with `web/deck.html` or starting a new classroom identity.

When the migration is approved:

1. Back up the current service and code. Record the private deck checksum without copying its content into Git.
2. Copy `src/westlake_ppt/` and dependencies. Copy shared `web/assets/` to the existing deployment `assets/` path. Do not copy the generic deck, demo fixtures, research data or results over the private lecture.
3. Keep `PPT_CONFIG_PATH`, private credentials, `CLASSROOM_DATA_DIR`, access restrictions and deck ID unchanged. Install the updated service with its explicit web root/deck settings.
4. Reload systemd and restart only `westlake-ppt`. Verify health, authenticated classroom management, the unchanged private deck checksum and representative frontend interactions.
5. Roll back code and the saved service if verification fails. Do not publish the private lecture or credentials as debugging artifacts.

Legacy `python server.py` remains valid from a checkout and serves its `web/` directory. An old flat deployment using that wrapper must set `PPT_WEB_ROOT` and `PPT_DECK` explicitly, or continue using its old release until the full package is copied. The original Chinese launcher delegates to `launch.command`. Existing browser asset URLs are unchanged.

See [configuration](configuration.md) for environment values and [deployment log](deployment-log.md) for verification status. There is no claim that local tests verify the remote service.
