const mod = require("../../workspace/best-available-seat/main");

describe("findBestSeats", () => {
  test("finds best seat for each budget", () => {
    const prices = [50, 30, 80, 20, 60];
    const budgets = [45, 70, 10];
    expect(mod.findBestSeats(prices, budgets)).toEqual([30, 60, -1]);
  });

  test("returns negative one when no seat is affordable", () => {
    const prices = [100, 200, 300];
    const budgets = [50, 99];
    expect(mod.findBestSeats(prices, budgets)).toEqual([-1, -1]);
  });

  test("exact budget match returns that price", () => {
    const prices = [10, 25, 50, 75];
    const budgets = [50, 25];
    expect(mod.findBestSeats(prices, budgets)).toEqual([50, 25]);
  });

  test("returns most expensive when all are affordable", () => {
    const prices = [5, 10, 15];
    const budgets = [100, 20];
    expect(mod.findBestSeats(prices, budgets)).toEqual([15, 15]);
  });

  test("empty price list returns all negative ones", () => {
    const prices = [];
    const budgets = [10, 20, 30];
    expect(mod.findBestSeats(prices, budgets)).toEqual([-1, -1, -1]);
  });

  test("handles many seats and budgets", () => {
    const prices = Array.from({ length: 10000 }, (_, i) => i + 1);
    const budgets = [5000, 9999, 1, 10000, 0];
    expect(mod.findBestSeats(prices, budgets)).toEqual([5000, 9999, 1, 10000, -1]);
  });

  test("output array length matches budgets array length", () => {
    const prices = [20, 40, 60];
    const budgets = [10, 50, 30, 70];
    const result = mod.findBestSeats(prices, budgets);
    expect(result).toHaveLength(4);
    expect(result).toEqual([-1, 40, 20, 60]);
  });

  test("single budget with single price within budget", () => {
    const prices = [25];
    const budgets = [30];
    expect(mod.findBestSeats(prices, budgets)).toEqual([25]);
  });

  test("duplicate prices returns highest affordable price", () => {
    const prices = [30, 30, 50, 50];
    const budgets = [35, 55];
    expect(mod.findBestSeats(prices, budgets)).toEqual([30, 50]);
  });

  test("selects most expensive affordable not first affordable", () => {
    const prices = [10, 90, 50, 30, 70];
    const budgets = [60];
    expect(mod.findBestSeats(prices, budgets)).toEqual([50]);
  });

  test("budget of zero with all positive prices returns negative one", () => {
    const prices = [1, 5, 10];
    const budgets = [0];
    expect(mod.findBestSeats(prices, budgets)).toEqual([-1]);
  });

  test("returns zero when a free seat is the best match", () => {
    const prices = [0, 50, 100];
    const budgets = [0, 25];
    expect(mod.findBestSeats(prices, budgets)).toEqual([0, 0]);
  });

  test("does not mutate the prices or budgets arrays", () => {
    const prices = [50, 30, 80, 20, 60];
    const budgets = [45, 70, 10];
    const pricesSnapshot = [...prices];
    const budgetsSnapshot = [...budgets];
    mod.findBestSeats(prices, budgets);
    expect(prices).toEqual(pricesSnapshot);
    expect(budgets).toEqual(budgetsSnapshot);
  });
});
