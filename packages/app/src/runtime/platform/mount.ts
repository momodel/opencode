// Solid Router matches against its base, but useLocation still returns the browser path.
export function mount() {
  return (document.querySelector("base[data-opencode-base]")?.getAttribute("href") ?? "").replace(/\/+$/, "")
}

export function appPath(path: string) {
  const base = mount()
  return base && (path === base || path.startsWith(base + "/")) ? path.slice(base.length) || "/" : path
}
