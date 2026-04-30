import enMessages from "./messages/en.json";
import zhMessages from "./messages/zh.json";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function flattenLeaves(
  obj: JsonValue,
  prefix = ""
): Array<[string, JsonValue]> {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return [[prefix, obj]];
  }
  const out: Array<[string, JsonValue]> = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    out.push(...flattenLeaves(v, path));
  }
  return out;
}

function leafPaths(obj: JsonValue): string[] {
  return flattenLeaves(obj)
    .map(([path]) => path)
    .sort();
}

// Extract top-level ICU placeholder names from a translation value.
//
// We track brace depth so that nested formatter sub-clauses
// (e.g. the `one {tool}` / `other {tools}` blocks inside a `plural`) are
// ignored — those are internal labels, not externally-bound variables.
// Only the variable name at depth-0 braces (the names a caller has to bind)
// counts toward parity.
function extractIcuVariables(value: string): string[] {
  const out = new Set<string>();
  let depth = 0;
  let i = 0;
  while (i < value.length) {
    const ch = value[i]!;
    if (ch === "{") {
      if (depth === 0) {
        const rest = value.slice(i + 1);
        const m = rest.match(/^\s*([a-zA-Z_$][\w$]*)/);
        if (m) out.add(m[1]!);
      }
      depth += 1;
    } else if (ch === "}") {
      depth = Math.max(0, depth - 1);
    }
    i += 1;
  }
  return Array.from(out).sort();
}

const enLeaves = flattenLeaves(enMessages as JsonValue);
const zhLeaves = flattenLeaves(zhMessages as JsonValue);
const zhByPath = new Map(zhLeaves);

describe("i18n message file parity", () => {
  it("has 13 top-level namespaces in both files", () => {
    const enKeys = Object.keys(enMessages).sort();
    const zhKeys = Object.keys(zhMessages).sort();
    expect(enKeys).toHaveLength(13);
    expect(zhKeys).toEqual(enKeys);
  });

  it("has the same set of leaf keys in en and zh", () => {
    const enPaths = leafPaths(enMessages as JsonValue);
    const zhPaths = leafPaths(zhMessages as JsonValue);
    expect(zhPaths).toEqual(enPaths);
  });

  it("has only string leaf values", () => {
    const nonStrings: string[] = [];
    for (const [path, value] of enLeaves) {
      if (typeof value !== "string") nonStrings.push(`en:${path}`);
    }
    for (const [path, value] of zhLeaves) {
      if (typeof value !== "string") nonStrings.push(`zh:${path}`);
    }
    expect(nonStrings).toEqual([]);
  });

  it("uses the same ICU placeholder variables in en and zh for every key", () => {
    const mismatches: string[] = [];
    for (const [path, enValue] of enLeaves) {
      const zhValue = zhByPath.get(path);
      if (typeof enValue !== "string" || typeof zhValue !== "string") continue;
      const enVars = extractIcuVariables(enValue);
      const zhVars = extractIcuVariables(zhValue);
      if (enVars.join(",") !== zhVars.join(",")) {
        mismatches.push(
          `${path}: en=[${enVars.join(",")}] zh=[${zhVars.join(",")}]`
        );
      }
    }
    expect(mismatches).toEqual([]);
  });
});
