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
    // [1,3,5] = indices where nums[i]+nums[j]+nums[k]=9 → values [2,3,4] or [1,3,5]
    expect(result.length).toBeGreaterThan(0);
    for (const triplet of result) {
      expect(triplet.reduce((a, b) => a + b, 0)).toBe(9);
    }
  });

  test("no three sum solution", () => {
    const result = mod.threeSum([1, 2, 3], 100);
    expect(result).toEqual([]);
  });

  test("three sum with duplicates", () => {
    const result = mod.threeSum([1, 1, 1, 2, 2, 3, 3], 6);
    // Should not contain duplicate triplets
    const serialized = result.map((t) => t.sort().join(","));
    const unique = new Set(serialized);
    expect(unique.size).toBe(serialized.length);
    for (const triplet of result) {
      expect(triplet.reduce((a, b) => a + b, 0)).toBe(6);
    }
  });

  test("three sum negative numbers", () => {
    const result = mod.threeSum([-1, 0, 1, 2, -1, -4], 0);
    expect(result.length).toBeGreaterThan(0);
    for (const triplet of result) {
      expect(triplet.reduce((a, b) => a + b, 0)).toBe(0);
    }
    // Check no duplicates
    const serialized = result.map((t) => t.sort().join(","));
    const unique = new Set(serialized);
    expect(unique.size).toBe(serialized.length);
  });
});
