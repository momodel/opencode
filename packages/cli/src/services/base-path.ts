import { Effect, FileSystem, Option, Schema } from "effect"
import { parse } from "jsonc-parser"
import path from "node:path"

const decode = Schema.decodeUnknownOption(
  Schema.Struct({ server: Schema.optional(Schema.Struct({ basePath: Schema.optional(Schema.String) })) }),
)

export const resolve = Effect.fnUntraced(function* (flag?: string, dir?: string) {
  const fs = yield* FileSystem.FileSystem
  const cfg = (text: string) => Option.getOrUndefined(decode(parse(text)))?.server?.basePath
  const files = dir
    ? [
        ...[dir, process.cwd()].flatMap((root) =>
          ["opencode.json", "opencode.jsonc"].map((name) => path.join(root, name)),
        ),
        ...(process.env.OPENCODE_CONFIG ? [process.env.OPENCODE_CONFIG] : []),
      ]
    : []
  const values =
    flag === undefined
      ? yield* Effect.forEach(files, (file) =>
          fs.readFileString(file).pipe(
            Effect.map(cfg),
            Effect.orElseSucceed(() => undefined),
          ),
        )
      : []
  const base = (
    flag ??
    (dir && process.env.OPENCODE_CONFIG_CONTENT ? cfg(process.env.OPENCODE_CONFIG_CONTENT) : undefined) ??
    values.findLast((value) => value !== undefined) ??
    ""
  ).replace(/\/+$/, "")
  if (base && (!/^(?:\/[\w.~-]+)+$/.test(base) || base.split("/").some((part) => part === "." || part === "..")))
    return yield* Effect.fail(
      new Error("Expected --base-path to be an absolute URL path, such as /hub_api/opencode/user"),
    )
  return base
})
