const { twoSum } = require("../../problems/sample-problem/main");

describe("twoSum", () => {
  test("basic case", () => {
    const result = twoSum([2, 7, 11, 15], 9);
    expect(result.sort()).toEqual([0, 1]);
  });

  test("no solution returns undefined or empty", () => {
    const result = twoSum([1, 2, 3], 10);
    expect(result == null || (Array.isArray(result) && result.length === 0)).toBe(true);
  });

  test("duplicate values", () => {
    const result = twoSum([3, 3], 6);
    expect(result.sort()).toEqual([0, 1]);
  });

  test("negative numbers", () => {
    const result = twoSum([-1, -2, -3, -4, -5], -8);
    expect(result.sort()).toEqual([2, 4]);
  });

  test("large input", () => {
    const nums = Array.from({ length: 10000 }, (_, i) => i);
    const result = twoSum(nums, 19997);
    expect(result.sort()).toEqual([9998, 9999]);
  });
});
