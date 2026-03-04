const mod = require("../../workspace/flatten-and-sum/main");

// ---- Part 1: flattenArray ----

describe("flattenArray", () => {
  test("already flat array", () => {
    expect(mod.flattenArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  test("single level nesting", () => {
    expect(mod.flattenArray([1, [2, 3], 4])).toEqual([1, 2, 3, 4]);
  });

  test("deep nesting", () => {
    expect(mod.flattenArray([1, [2, [3, [4, [5]]]]])).toEqual([1, 2, 3, 4, 5]);
  });

  test("empty array", () => {
    expect(mod.flattenArray([])).toEqual([]);
  });

  test("mixed depth", () => {
    expect(mod.flattenArray([[1], 2, [[3]], [4, [5, 6]]])).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });
});

// ---- Part 2: sumNested ----

describe("sumNested", () => {
  test("single number nested deep", () => {
    expect(mod.sumNested([[[[[42]]]]])).toBe(42);
  });

  test("multiple numbers across depths", () => {
    expect(mod.sumNested([1, [2, [3]], 4])).toBe(10);
  });

  test("empty nested array", () => {
    expect(mod.sumNested([])).toBe(0);
  });

  test("all zeros", () => {
    expect(mod.sumNested([0, [0, [0]], 0])).toBe(0);
  });

  test("large nested structure", () => {
    // 1+2+3+...+10 = 55
    expect(
      mod.sumNested([1, [2, [3, [4, [5, [6, [7, [8, [9, [10]]]]]]]]]])
    ).toBe(55);
  });
});
