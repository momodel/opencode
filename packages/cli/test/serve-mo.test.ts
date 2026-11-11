import { expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { isolatedEnv } from "./fixture/environment"

const base = "/hub_api/opencode/test-user"
const entry = path.join(import.meta.dir, "../src/index.ts")

test.each([
  { flags: ["--hostname=0.0.0.0"], hubUser: "test-user==", hostname: "0.0.0.0", password: undefined, status: 200 },
  { flags: ["--mdns"], hubUser: "test-user==", hostname: "0.0.0.0", password: "fixture-secret", status: 401 },
  { flags: [], hubUser: undefined, hostname: "127.0.0.1", password: undefined, status: 401 },
  { flags: [], hubUser: "another-user", hostname: "127.0.0.1", password: undefined, status: 401 },
])("uses $hostname and returns HTTP $status for an unauthenticated MO workspace request", async (scenario) => {
  const root = await mkdtemp(path.join(tmpdir(), "opencode-serve-mo-"))
  try {
    await using child = Bun.spawn(
      [process.execPath, entry, "serve", "--port=0", `--base-path=${base}/`, ...scenario.flags],
      {
        env: isolatedEnv(root, {
          JUPYTERHUB_USER: scenario.hubUser,
          OPENCODE_PASSWORD: scenario.password,
          OPENCODE_SERVER_PASSWORD: undefined,
        }),
        stdout: "pipe",
        stderr: "inherit",
        timeout: 15_000,
      },
    )
    let output = ""
    for await (const chunk of child.stdout.pipeThrough(new TextDecoderStream())) {
      output += chunk
      const address = output.match(/server listening on (http:\/\/[^\s]+)\s/)?.[1]
      if (!address) continue
      const url = new URL(address)
      expect(url.hostname).toBe(scenario.hostname)
      url.hostname = "127.0.0.1"
      url.pathname += "/api/info"
      const response = await fetch(url, { signal: AbortSignal.timeout(5_000) })
      expect(response.status).toBe(scenario.status)
      await response.arrayBuffer()
      if (scenario.password) {
        const authorized = await fetch(url, {
          headers: { authorization: `Basic ${btoa(`opencode:${scenario.password}`)}` },
          signal: AbortSignal.timeout(5_000),
        })
        expect(authorized.status).toBe(200)
        await authorized.arrayBuffer()
      }
      return
    }
    throw new Error(`OpenCode did not start: ${output}`)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
