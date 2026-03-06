const mod = require("../../workspace/sample-problem/main");

// --- Part 1: Two Sum — Brute Force ---

describe("twoSum", () => {
  test("basic case", () => {
    const result = mod.twoSum([2, 7, 11, 15], 9);
    expect(result.sort()).toEqual([0, 1]);
  });

  test("no solution returns undefined or empty", () => {
    const result = mod.twoSum([1, 2, 3], 10);
    expect(
      result == null || (Array.isArray(result) && result.length === 0)
    ).toBe(true);
  });

  test("duplicate values", () => {
    const result = mod.twoSum([3, 3], 6);
    expect(result.sort()).toEqual([0, 1]);
  });

  test("pair in the middle of a larger array", () => {
    const result = mod.twoSum([10, 20, 3, 7, 40, 50], 10);
    expect(result.sort()).toEqual([2, 3]);
  });

  test("target is zero with positive and negative values", () => {
    const result = mod.twoSum([4, -4, 8, 2], 0);
    expect(result.sort()).toEqual([0, 1]);
  });

  test("does not use same element twice when value is half of target", () => {
    const result = mod.twoSum([5, 3, 10, 7], 10);
    expect(result.sort()).toEqual([1, 3]);
  });

  test("two element array that sums to target", () => {
    const result = mod.twoSum([1, 4], 5);
    expect(result.sort()).toEqual([0, 1]);
  });

  test("solution uses last element in array", () => {
    const result = mod.twoSum([8, 1, 3, 12, 6], 18);
    expect(result.sort()).toEqual([0, 3]);
  });

  test("preserves the original nums array", () => {
    const nums = [2, 7, 11, 15];
    const snapshot = [...nums];
    mod.twoSum(nums, 9);
    expect(nums).toEqual(snapshot);
  });

  // --- Part 2: Two Sum — Optimized ---

  test("negative numbers", () => {
    const result = mod.twoSum([-1, -2, -3, -4, -5], -8);
    expect(result.sort()).toEqual([2, 4]);
  });

  test("large input", () => {
    const nums = Array.from({ length: 10000 }, (_, i) => i);
    const result = mod.twoSum(nums, 19997);
    expect(result.sort()).toEqual([9998, 9999]);
  });
});

// --- Part 3: Three Sum ---

describe("threeSum", () => {
  test("basic three sum", () => {
    const result = mod.threeSum([1, 2, 3, 4, 5], 9);
    const sorted = result.map((t) => [...t].sort((a, b) => a - b));
    sorted.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    expect(sorted).toEqual([[1, 3, 5], [2, 3, 4]]);
  });

  test("no three sum solution", () => {
    const result = mod.threeSum([1, 2, 3], 100);
    expect(result).toEqual([]);
  });

  test("three sum with duplicates", () => {
    const result = mod.threeSum([1, 1, 1, 2, 2, 3, 3], 6);
    const sorted = result.map((t) => [...t].sort((a, b) => a - b));
    sorted.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    // Should not contain duplicate triplets
    const serialized = sorted.map((t) => t.join(","));
    const unique = new Set(serialized);
    expect(unique.size).toBe(serialized.length);
    for (const triplet of sorted) {
      expect(triplet.reduce((a, b) => a + b, 0)).toBe(6);
    }
    expect(sorted).toEqual([[1, 2, 3]]);
  });

  test("three sum negative numbers", () => {
    const result = mod.threeSum([-1, 0, 1, 2, -1, -4], 0);
    const sorted = result.map((t) => [...t].sort((a, b) => a - b));
    sorted.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    expect(sorted).toEqual([[-1, -1, 2], [-1, 0, 1]]);
  });

  test("three sum single valid triplet", () => {
    const result = mod.threeSum([1, 2, 3], 6);
    const sorted = result.map((t) => [...t].sort((a, b) => a - b));
    expect(sorted).toEqual([[1, 2, 3]]);
  });

  test("three sum with all same values", () => {
    const result = mod.threeSum([5, 5, 5, 5], 15);
    const sorted = result.map((t) => [...t].sort((a, b) => a - b));
    expect(sorted).toEqual([[5, 5, 5]]);
  });

  test("three sum returns empty for two element input", () => {
    const result = mod.threeSum([1, 2], 3);
    expect(result).toEqual([]);
  });

  test("three sum with zeros", () => {
    const result = mod.threeSum([0, 0, 0, 0], 0);
    const sorted = result.map((t) => [...t].sort((a, b) => a - b));
    expect(sorted).toEqual([[0, 0, 0]]);
  });

  test("preserves the original array when finding triplets", () => {
    const nums = [1, 2, 3, 4, 5];
    const snapshot = [...nums];
    mod.threeSum(nums, 9);
    expect(nums).toEqual(snapshot);
  });
});
