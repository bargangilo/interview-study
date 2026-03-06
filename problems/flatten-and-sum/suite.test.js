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

  test("single element array", () => {
    expect(mod.flattenArray([42])).toEqual([42]);
  });

  test("empty sub-arrays mixed with values", () => {
    expect(mod.flattenArray([[], 1, [[], 2], []])).toEqual([1, 2]);
  });

  test("preserves element order across nesting levels", () => {
    expect(mod.flattenArray([[3, 1], [4], [[1, 5]]])).toEqual([3, 1, 4, 1, 5]);
  });

  test("preserves zero values in flattened output", () => {
    expect(mod.flattenArray([0, [1, [0, 2]], 0])).toEqual([0, 1, 0, 2, 0]);
  });

  test("does not mutate the input array", () => {
    const input = [1, [2, [3]], 4];
    const snapshot = JSON.parse(JSON.stringify(input));
    mod.flattenArray(input);
    expect(input).toEqual(snapshot);
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

  test("negative numbers sum correctly", () => {
    expect(mod.sumNested([-1, [2, [-3]], 4])).toBe(2);
  });

  test("nested empty sub-arrays sum to zero", () => {
    expect(mod.sumNested([[], [[]], [[[]]]])).toBe(0);
  });

  test("single flat number", () => {
    expect(mod.sumNested([7])).toBe(7);
  });

  test("does not mutate the nested input", () => {
    const input = [1, [2, [3]], 4];
    const snapshot = JSON.parse(JSON.stringify(input));
    mod.sumNested(input);
    expect(input).toEqual(snapshot);
  });
});
