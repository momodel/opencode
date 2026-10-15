import { expect, test } from "bun:test"
import { normalizeBasePath, rewriteHTML, stripBasePath } from "../../src/server/shared/base-path"
import { cspForHtml } from "../../src/server/shared/ui"
import { createHash } from "node:crypto"
import { Server } from "../../src/server/server"
import { tmpdir } from "../fixture/fixture"
import path from "node:path"

test("MO prefix preserves API query, WebSocket path and sibling prefixes", () => {
  const base = normalizeBasePath("/hub_api/opencode/user/")
  expect(stripBasePath(base + "/global/health?a=1", base)).toBe("/global/health?a=1")
  expect(stripBasePath(base + "/pty/id/connect", base)).toBe("/pty/id/connect")
  expect(stripBasePath(base + "?a=1", base)).toBe("/?a=1")
  expect(stripBasePath(base + "-other/global/health", base)).toBe(base + "-other/global/health")
  expect(() => normalizeBasePath("//external/path")).toThrow()
  expect(() => normalizeBasePath("/a/../b")).toThrow()
})

test("local HTML routes assets under prefix and hashes runtime script", () => {
  const html = rewriteHTML('<html><head><script type="module" src="/assets/a.js"></script></head></html>', "/foo")
  expect(html).toContain('src="/foo/assets/a.js"')
  expect(html).toContain('<base href="/foo/">')
  const script = html.match(/<script id="oc-base-path-script">([\s\S]*?)<\/script>/)![1]
  expect(cspForHtml(html)).toContain(`'sha256-${createHash("sha256").update(script).digest("base64")}'`)
  expect(cspForHtml(html)).not.toContain("'unsafe-inline'; style")
})

test("listener serves prefixed health, local UI and assets without upstream", async () => {
  await using dir = await tmpdir()
  await Bun.write(path.join(dir.path, "index.html"), '<html><head></head><body>MO local UI</body></html>')
  await Bun.write(path.join(dir.path, "asset.js"), "export default 1")
  const previous = process.env.OPENCODE_APP_DIR
  process.env.OPENCODE_APP_DIR = dir.path
  const server = await Server.listen({ hostname: "127.0.0.1", port: 0, basePath: "/hub_api/opencode/test/" })
  try {
    const health = await fetch(new URL("/hub_api/opencode/test/global/health", server.url))
    expect(health.status).toBe(200)
    expect((await health.json()).healthy).toBe(true)
    const ui = await fetch(new URL("/hub_api/opencode/test/", server.url))
    expect(ui.status).toBe(200)
    expect(await ui.text()).toContain('<base href="/hub_api/opencode/test/">')
    const asset = await fetch(new URL("/hub_api/opencode/test/asset.js", server.url))
    expect(await asset.text()).toBe("export default 1")
    const missing = await fetch(new URL("/hub_api/opencode/test/missing.js", server.url))
    expect(missing.status).toBe(404)
  } finally {
    await server.stop(true)
    if (previous === undefined) delete process.env.OPENCODE_APP_DIR
    else process.env.OPENCODE_APP_DIR = previous
  }
}, 30_000)
