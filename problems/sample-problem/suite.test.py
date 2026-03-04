import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "workspace", "sample-problem"))

# --- Part 1: Two Sum — Brute Force ---


def test_basic_case():
    from main import two_sum
    result = two_sum([2, 7, 11, 15], 9)
    assert sorted(result) == [0, 1]


def test_no_solution_returns_undefined_or_empty():
    from main import two_sum
    result = two_sum([1, 2, 3], 10)
    assert result is None or result == []


def test_duplicate_values():
    from main import two_sum
    result = two_sum([3, 3], 6)
    assert sorted(result) == [0, 1]


# --- Part 2: Two Sum — Optimized ---


def test_negative_numbers():
    from main import two_sum
    result = two_sum([-1, -2, -3, -4, -5], -8)
    assert sorted(result) == [2, 4]


def test_large_input():
    from main import two_sum
    nums = list(range(10000))
    result = two_sum(nums, 19997)
    assert sorted(result) == [9998, 9999]


# --- Part 3: Three Sum ---


def test_basic_three_sum():
    from main import three_sum
    result = three_sum([1, 2, 3, 4, 5], 9)
    assert len(result) > 0
    for triplet in result:
        assert sum(triplet) == 9


def test_no_three_sum_solution():
    from main import three_sum
    result = three_sum([1, 2, 3], 100)
    assert result == []


def test_three_sum_with_duplicates():
    from main import three_sum
    result = three_sum([1, 1, 1, 2, 2, 3, 3], 6)
    # Check no duplicate triplets
    serialized = [tuple(sorted(t)) for t in result]
    assert len(serialized) == len(set(serialized))
    for triplet in result:
        assert sum(triplet) == 6


def test_three_sum_negative_numbers():
    from main import three_sum
    result = three_sum([-1, 0, 1, 2, -1, -4], 0)
    assert len(result) > 0
    for triplet in result:
        assert sum(triplet) == 0
    # Check no duplicates
    serialized = [tuple(sorted(t)) for t in result]
    assert len(serialized) == len(set(serialized))
