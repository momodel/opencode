import { Effect, Option } from "effect"
import { Commands } from "../commands"
import { Env } from "../../env"
import { Runtime } from "../../framework/runtime"
import { ServerProcess } from "../../server-process"

export default Runtime.handler(
  Commands.commands.serve,
  Effect.fnUntraced(function* (input) {
    if (input.service && input.stdio) return yield* Effect.fail(new Error("--service and --stdio cannot be combined"))
    if (input.noAuth && (input.service || input.stdio))
      return yield* Effect.fail(new Error("--experimental-no-auth is only supported in foreground serve"))
    const basePath = Option.getOrUndefined(input.basePath)
    const hubUser =
      !input.service && !input.stdio && basePath?.startsWith("/hub_api/opencode/")
        ? (yield* Env.jupyterHubUser)?.replace(/=+$/, "")
        : undefined
    const moNotebook = !!hubUser && basePath?.replace(/\/+$/, "") === `/hub_api/opencode/${hubUser}`
    if (input.mdns && !moNotebook)
      return yield* Effect.fail(new Error("--mdns is only accepted for the legacy MO Notebook launcher"))
    return yield* ServerProcess.run({
      mode: input.service ? "service" : input.stdio ? "stdio" : "default",
      auth: input.noAuth ? "off" : moNotebook ? "if-configured" : undefined,
      // In v1 --mdns selected a bind reachable by the Hub proxy. No service discovery is needed in MO.
      hostname: Option.getOrUndefined(input.hostname) ?? (input.mdns ? "0.0.0.0" : undefined),
      basePath,
      port: Option.getOrUndefined(input.port),
      cors: input.cors.length > 0 ? input.cors : undefined,
    })
  }),
)
