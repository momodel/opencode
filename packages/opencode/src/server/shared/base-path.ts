export function normalizeBasePath(value = "/") {
  if (!value.startsWith("/") || /[^/A-Za-z0-9._~!$&()*+,;=:@%\-]/.test(value) || value.includes("..") || value.startsWith("//")) {
    throw new Error("Invalid OpenCode base path")
  }
  return value.replace(/\/+$/, "")
}

export function stripBasePath(url: string, basePath: string) {
  if (!basePath) return url
  if (url === basePath || url.startsWith(basePath + "?")) return "/" + url.slice(basePath.length)
  return url.startsWith(basePath + "/") ? url.slice(basePath.length) : url
}

export function rewriteHTML(body: string, basePath: string) {
  if (!basePath) return body
  const script = `window.__OPENCODE_BASE_URL__=${JSON.stringify(basePath).replaceAll("<", "\\u003c")}`
  return body
    .replace(/(src|href)="\/(?!\/)/g, `$1="${basePath}/`)
    .replace(/<head(\s[^>]*)?>/i, (head) => `${head}<base href="${basePath}/"><script id="oc-base-path-script">${script}</script>`)
}
