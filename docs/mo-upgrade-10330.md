# MO OpenCode 1.19 upgrade candidate

Refs https://github.com/Acrobaticat/mo/issues/10330

## Source and scope

- Official base: v1.19.0, commit `733b2c627e5aec39cb33cc22373bdce33053ef2c`.
- Candidate runtime version: `1.19.0+mo.1`; build channel: `latest`.
- Preserve the committed MO `--base-path`/`server.basePath` integration, local web assets and default light theme. The MO/JupyterLab rocket and loading images are outside this repository and unchanged.
- The old Hono server has become Effect HttpApi/NodeHttpServer. Prefix removal happens once before both HTTP and upgrade handlers. The official embedded web UI remains the fallback when `OPENCODE_APP_DIR` is unset.
- Vite uses relative assets; the HTML runtime prefix sets both the browser router and SDK server URL. Injected runtime script has an explicit CSP SHA-256 hash; no new unsafe-inline permission.
- Do not include uncommitted old-fork session/timezone edits in this upgrade.

## Local checks

- `bun install --frozen-lockfile`: pass with Node 24.15.0 and Bun 1.3.14. Node 18 failed in upstream tree-sitter-powershell/node-gyp install.
- `bun typecheck` in packages/app and packages/opencode: pass.
- `bun test --timeout 30000 test/server/base-path.test.ts test/server/httpapi-listen.test.ts` in packages/opencode: 14 pass, 0 fail, 51 assertions. An earlier run during compilation hit two upstream default 5-second timeouts; the explicit 30-second rerun passed.
- Native darwin-arm64 build, embedded UI and binary version smoke test: pass, version `1.19.0+mo.1`.
- Independent browser: prefixed project/session page renders and Prompt accepts typed text. No prompt was sent. Screenshot: `/tmp/opencode-10330-final-input.png`; resource readback: `/tmp/opencode-10330-browser-resources.json`.
- Local build used the upstream test model snapshot to avoid external catalog access. It is a test artifact, not a deployment artifact; the image build must obtain the full official model snapshot.

## Remaining acceptance

- Linux amd64 assets image and complete singleuser image have not been built or published.
- MO backend/Hub/JupyterLab with this new binary has not been deployed or tested.
- A real free-model reply was already covered by the official old/new A/B. This fork was not used for another model request.
- Session migration and rollback on a copied representative user database remain required. `latest` retains the `opencode.db` filename, but filename compatibility does not prove migration safety. Never run an older binary against an upgraded database; restore the pre-upgrade snapshot together with the old binary/image.
- `notebook-sync.ts` still matches the upstream Plugin event hook signature, but the actual notebook edit-to-MO refresh chain requires singleuser combination testing.
- Old-fork local-asset JS rewriting is replaced by relative Vite output; independently supplied older app assets must not be combined with this binary.
- No source push, image push, deployment, existing service restart, shared database change or credential access was performed.
