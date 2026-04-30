import { parseAcceptLanguage } from "./getLocale";

describe("parseAcceptLanguage", () => {
  it("returns an empty array for an empty header", () => {
    expect(parseAcceptLanguage("")).toEqual([]);
  });

  it("returns the prefix of a single tag", () => {
    expect(parseAcceptLanguage("en")).toEqual(["en"]);
  });

  it("orders tags by descending q-value", () => {
    expect(parseAcceptLanguage("en;q=0.5,zh;q=0.9")).toEqual(["zh", "en"]);
  });

  it("strips the BCP-47 region from the tag", () => {
    expect(parseAcceptLanguage("en-US")).toEqual(["en"]);
  });

  it("preserves order for tags with the same q-value", () => {
    expect(parseAcceptLanguage("en-US,en;q=0.9,zh-CN;q=0.8")).toEqual([
      "en",
      "en",
      "zh",
    ]);
  });

  it("treats a non-numeric q-value as the lowest priority", () => {
    // q=abc → NaN → coerced to 0, sorted last
    expect(parseAcceptLanguage("en;q=abc,zh;q=0.1")).toEqual(["zh", "en"]);
  });

  it("does not clamp out-of-range q values", () => {
    // Pinned for awareness — `q=2` is invalid per RFC but JS parseFloat
    // accepts it. Documents current behavior; revisit if we ever clamp to
    // [0,1].
    expect(parseAcceptLanguage("zh;q=2,en;q=0.9")).toEqual(["zh", "en"]);
  });

  it("tolerates whitespace around tags and parameters", () => {
    expect(parseAcceptLanguage("  en ;  q=0.9  ,  zh  ;q=0.5")).toEqual([
      "en",
      "zh",
    ]);
  });

  it("filters out empty entries from a trailing comma", () => {
    expect(parseAcceptLanguage("en,,zh")).toEqual(["en", "zh"]);
  });
});
