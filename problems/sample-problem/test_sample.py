import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "workspace", "sample-problem"))
from main import two_sum


def test_basic_case():
    result = two_sum([2, 7, 11, 15], 9)
    assert sorted(result) == [0, 1]


def test_no_solution():
    result = two_sum([1, 2, 3], 10)
    assert result is None or result == []


def test_duplicate_values():
    result = two_sum([3, 3], 6)
    assert sorted(result) == [0, 1]


def test_negative_numbers():
    result = two_sum([-1, -2, -3, -4, -5], -8)
    assert sorted(result) == [2, 4]


def test_large_input():
    nums = list(range(10000))
    result = two_sum(nums, 19997)
    assert sorted(result) == [9998, 9999]
