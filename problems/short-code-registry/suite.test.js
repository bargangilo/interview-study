const mod = require("../../workspace/short-code-registry/main");

// ---- Part 1: buildRegistry + lookupCode ----

describe("buildRegistry", () => {
  test("builds registry from multiple entries", () => {
    const result = mod.buildRegistry([
      ["gh", "github.com"],
      ["gl", "gitlab.com"],
      ["bb", "bitbucket.org"]
    ]);
    expect(result).toEqual({ gh: "github.com", gl: "gitlab.com", bb: "bitbucket.org" });
  });

  test("returns empty object for no entries", () => {
    expect(mod.buildRegistry([])).toEqual({});
  });

  test("first occurrence wins for duplicate codes", () => {
    const result = mod.buildRegistry([
      ["api", "api.primary.com"],
      ["cdn", "cdn.example.com"],
      ["api", "api.fallback.com"]
    ]);
    expect(result).toEqual({ api: "api.primary.com", cdn: "cdn.example.com" });
  });

  test("single entry produces single mapping", () => {
    expect(mod.buildRegistry([["home", "homepage.com"]])).toEqual({ home: "homepage.com" });
  });
});

describe("lookupCode", () => {
  test("retrieves value for registered code", () => {
    const registry = { gh: "github.com", gl: "gitlab.com" };
    expect(mod.lookupCode(registry, "gh")).toBe("github.com");
  });

  test("returns null for unregistered code", () => {
    const registry = { gh: "github.com" };
    expect(mod.lookupCode(registry, "xyz")).toBeNull();
  });

  test("retrieves from registry with many entries", () => {
    const entries = [];
    for (let i = 0; i < 200; i++) {
      entries.push([`code${i}`, `value${i}`]);
    }
    const registry = mod.buildRegistry(entries);
    expect(mod.lookupCode(registry, "code150")).toBe("value150");
  });

  test("handles code not in larger registry", () => {
    const entries = [];
    for (let i = 0; i < 50; i++) {
      entries.push([`k${i}`, `v${i}`]);
    }
    const registry = mod.buildRegistry(entries);
    expect(mod.lookupCode(registry, "missing")).toBeNull();
  });

  test("retrieves empty string value for registered code", () => {
    const registry = mod.buildRegistry([["empty", ""], ["ok", "value"]]);
    expect(mod.lookupCode(registry, "empty")).toBe("");
  });
});

// ---- Part 2: bulkRegister ----

describe("bulkRegister", () => {
  test("merges new entries into existing registry", () => {
    const result = mod.bulkRegister(
      { gh: "github.com" },
      [["gl", "gitlab.com"], ["bb", "bitbucket.org"]]
    );
    expect(result.registry).toEqual({
      gh: "github.com",
      gl: "gitlab.com",
      bb: "bitbucket.org"
    });
    expect(result.conflicts).toEqual([]);
  });

  test("preserves existing value on conflict", () => {
    const result = mod.bulkRegister(
      { api: "api.original.com" },
      [["api", "api.new.com"]]
    );
    expect(result.registry.api).toBe("api.original.com");
  });

  test("reports conflicting codes", () => {
    const result = mod.bulkRegister(
      { api: "api.original.com", cdn: "cdn.original.com" },
      [["api", "api.new.com"], ["web", "web.example.com"]]
    );
    expect(result.conflicts).toEqual(["api"]);
  });

  test("returns empty conflicts when no overlaps", () => {
    const result = mod.bulkRegister(
      { gh: "github.com" },
      [["gl", "gitlab.com"]]
    );
    expect(result.conflicts).toEqual([]);
  });

  test("empty additions returns original registry unchanged", () => {
    const result = mod.bulkRegister({ x: "1", y: "2" }, []);
    expect(result.registry).toEqual({ x: "1", y: "2" });
    expect(result.conflicts).toEqual([]);
  });

  test("empty base accepts all additions", () => {
    const result = mod.bulkRegister(
      {},
      [["a", "alpha"], ["b", "beta"]]
    );
    expect(result.registry).toEqual({ a: "alpha", b: "beta" });
    expect(result.conflicts).toEqual([]);
  });

  test("handles multiple conflicts in one call", () => {
    const result = mod.bulkRegister(
      { a: "1", b: "2", c: "3" },
      [["a", "x"], ["b", "y"], ["d", "4"]]
    );
    expect(result.registry).toEqual({ a: "1", b: "2", c: "3", d: "4" });
    expect(result.conflicts).toEqual(["a", "b"]);
  });

  test("handles many additions efficiently", () => {
    const base = {};
    for (let i = 0; i < 100; i++) {
      base[`existing${i}`] = `val${i}`;
    }
    const additions = [];
    for (let i = 0; i < 200; i++) {
      additions.push([`new${i}`, `newval${i}`]);
    }
    additions.push(["existing50", "conflict"]);
    const result = mod.bulkRegister(base, additions);
    expect(result.registry.new199).toBe("newval199");
    expect(result.registry.existing50).toBe("val50");
    expect(result.conflicts).toContain("existing50");
  });

  test("conflicts appear in encounter order", () => {
    const result = mod.bulkRegister(
      { z: "1", a: "2", m: "3" },
      [["m", "x"], ["z", "y"], ["a", "w"], ["new", "v"]]
    );
    expect(result.conflicts).toEqual(["m", "z", "a"]);
  });

  test("reports conflict for duplicate within additions", () => {
    const result = mod.bulkRegister(
      {},
      [["x", "first"], ["y", "yes"], ["x", "second"]]
    );
    expect(result.registry.x).toBe("first");
    expect(result.conflicts).toEqual(["x"]);
  });

  test("does not mutate the original registry", () => {
    const original = { gh: "github.com" };
    const snapshot = { ...original };
    mod.bulkRegister(original, [["gl", "gitlab.com"]]);
    expect(original).toEqual(snapshot);
  });
});
