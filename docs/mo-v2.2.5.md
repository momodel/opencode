# OpenCode v2.2.5 for MO

This branch starts from upstream v2.2.5 (`9bbb8ce18c80f099e0e448775f59d965ead40a21`). The existing v1.2.17 MO branch stays available at `a6cca8178e`.

## Build and run

Use Node 24 and Bun 1.4.4, as in the upstream release workflow:

```sh
bun install --frozen-lockfile
cd packages/cli
OPENCODE_VERSION=2.2.5+mo.1 bun run build --single --skip-install
```

On the target Linux amd64 build host, the binary is `packages/cli/dist/cli-linux-x64/bin/opencode`. The build embeds the matching Web UI and also writes `packages/app/dist`. If packaging those assets separately, set `OPENCODE_APP_DIR` to that matching dist directory. With no local index, the binary serves its own embedded assets. Do not pair the v2 binary with v1 Web assets.

```sh
opencode serve --hostname 127.0.0.1 --port 4096 --base-path=/hub_api/opencode/test-user/
```

`server.basePath` in `opencode.json` or `opencode.jsonc` is an alternative for foreground serve. It is read from the OpenCode config directory and startup directory; `OPENCODE_CONFIG`, `OPENCODE_CONFIG_CONTENT`, and `--base-path` override those files in that order. Use the full proxy prefix including the per-server Hub name. The old launcher's `--mdns` flag is absent in v2 and needs to be removed from the singleuser launch command.

## MO proxy and iframe

- Preserve the path through the proxy and forward WebSocket upgrades and streaming responses. For health, use the v2 `GET <prefix>/api/info` with credentials.
- v2 always authenticates API access. For seamless iframe access, the authenticated MO proxy needs to authorize the user for the target server and supply the server's matching Basic credential. Keep `OPENCODE_PASSWORD` in the singleuser service and the trusted proxy's credential store; do not put it in the iframe URL. Otherwise use the v2 sign-in flow.
- Existing iframe paths `<prefix>/<base64-directory>/session` open a v2 draft for that directory. An old URL that includes a session ID redirects to the v2 session route.
- The mounted HTML uses relative assets and a runtime base URL. PWA registration remains at the root; a mounted iframe skips it because its HTML differs from the build-time integrity entry. Existing WebAssembly support and the theme script's CSP hash are retained.

## Acceptance and rollback

Before changing the deployed singleuser image, run the new binary behind the MO test proxy with a throwaway user. Check iframe sign-in or proxy auth, reload, historical and new sessions, a model reply, terminal, file and attachment access, and the notebook sync plugin. Verify the Linux amd64 binary and Web bundle come from the same build.

Use a representative copy of the v1 data to check migration. Keep the old image, user config and pre-upgrade database snapshot together. To roll back, stop the v2 instance, restore those artifacts, then start the v1 instance. Never point the v1 binary at a database modified by v2.

## Local evidence

- Official v2.2.5 source built and served the root UI and authenticated health endpoint.
- MO's macOS arm64 build reports `2.2.5+mo.1`. The repository check passed. The Web UI suite passed 4 tests and the upstream v1 migration suite passed 36 tests.
- An isolated Chromium browser opened the existing iframe URL directly into a draft in the encoded directory. Reload retained the draft route, the default theme was light with a dark system preference, and browser API requests kept the prefix. An old saved-session link opened in the v2 route and rendered highlighted code. A root-path browser retained its saved dark theme.
- The compiled CLI served both the configured local UI and the embedded fallback. Authenticated SSE, session creation/readback, and a ticketed terminal WebSocket carrying actual shell output passed over the prefix.
- A disposable database built from the v1.2.17 SQL migrations kept its test session and message after upgrading. A new v2 session received a reply from a local test provider. Restoring the pre-upgrade snapshot recovered the v1 fixture and passed SQLite integrity checking.

- The local Docker image `opencode-mo:2.2.5-local` was built for Linux amd64 and reports `2.2.5+mo.1`. In an isolated container, its packaged local UI, authenticated SSE, session create/read, and terminal WebSocket passed. It is a test image, separate from the MO singleuser image.

The database above contains synthetic data. Real user data, the existing notebook plugin, and the deployed MO proxy have not been validated.
