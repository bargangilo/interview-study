import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "workspace", "short-code-registry"))


# ---- Part 1: build_registry + lookup_code ----


def test_builds_registry_from_multiple_entries():
    from main import build_registry
    result = build_registry([["gh", "github.com"], ["gl", "gitlab.com"], ["bb", "bitbucket.org"]])
    assert result == {"gh": "github.com", "gl": "gitlab.com", "bb": "bitbucket.org"}


def test_returns_empty_object_for_no_entries():
    from main import build_registry
    assert build_registry([]) == {}


def test_first_occurrence_wins_for_duplicate_codes():
    from main import build_registry
    result = build_registry([["api", "api.primary.com"], ["cdn", "cdn.example.com"], ["api", "api.fallback.com"]])
    assert result == {"api": "api.primary.com", "cdn": "cdn.example.com"}


def test_single_entry_produces_single_mapping():
    from main import build_registry
    assert build_registry([["home", "homepage.com"]]) == {"home": "homepage.com"}


def test_retrieves_value_for_registered_code():
    from main import lookup_code
    registry = {"gh": "github.com", "gl": "gitlab.com"}
    assert lookup_code(registry, "gh") == "github.com"


def test_returns_null_for_unregistered_code():
    from main import lookup_code
    registry = {"gh": "github.com"}
    assert lookup_code(registry, "xyz") is None


def test_retrieves_from_registry_with_many_entries():
    from main import build_registry, lookup_code
    entries = [[f"code{i}", f"value{i}"] for i in range(200)]
    registry = build_registry(entries)
    assert lookup_code(registry, "code150") == "value150"


def test_handles_code_not_in_larger_registry():
    from main import build_registry, lookup_code
    entries = [[f"k{i}", f"v{i}"] for i in range(50)]
    registry = build_registry(entries)
    assert lookup_code(registry, "missing") is None


# ---- Part 2: bulk_register ----


def test_merges_new_entries_into_existing_registry():
    from main import bulk_register
    result = bulk_register(
        {"gh": "github.com"},
        [["gl", "gitlab.com"], ["bb", "bitbucket.org"]]
    )
    assert result["registry"] == {"gh": "github.com", "gl": "gitlab.com", "bb": "bitbucket.org"}
    assert result["conflicts"] == []


def test_preserves_existing_value_on_conflict():
    from main import bulk_register
    result = bulk_register(
        {"api": "api.original.com"},
        [["api", "api.new.com"]]
    )
    assert result["registry"]["api"] == "api.original.com"


def test_reports_conflicting_codes():
    from main import bulk_register
    result = bulk_register(
        {"api": "api.original.com", "cdn": "cdn.original.com"},
        [["api", "api.new.com"], ["web", "web.example.com"]]
    )
    assert result["conflicts"] == ["api"]


def test_returns_empty_conflicts_when_no_overlaps():
    from main import bulk_register
    result = bulk_register(
        {"gh": "github.com"},
        [["gl", "gitlab.com"]]
    )
    assert result["conflicts"] == []


def test_empty_additions_returns_original_registry_unchanged():
    from main import bulk_register
    result = bulk_register({"x": "1", "y": "2"}, [])
    assert result["registry"] == {"x": "1", "y": "2"}
    assert result["conflicts"] == []


def test_empty_base_accepts_all_additions():
    from main import bulk_register
    result = bulk_register({}, [["a", "alpha"], ["b", "beta"]])
    assert result["registry"] == {"a": "alpha", "b": "beta"}
    assert result["conflicts"] == []


def test_handles_multiple_conflicts_in_one_call():
    from main import bulk_register
    result = bulk_register(
        {"a": "1", "b": "2", "c": "3"},
        [["a", "x"], ["b", "y"], ["d", "4"]]
    )
    assert result["registry"] == {"a": "1", "b": "2", "c": "3", "d": "4"}
    assert result["conflicts"] == ["a", "b"]


def test_handles_many_additions_efficiently():
    from main import bulk_register
    base = {f"existing{i}": f"val{i}" for i in range(100)}
    additions = [[f"new{i}", f"newval{i}"] for i in range(200)]
    additions.append(["existing50", "conflict"])
    result = bulk_register(base, additions)
    assert result["registry"]["new199"] == "newval199"
    assert result["registry"]["existing50"] == "val50"
    assert "existing50" in result["conflicts"]


def test_conflicts_appear_in_encounter_order():
    from main import bulk_register
    result = bulk_register(
        {"z": "1", "a": "2", "m": "3"},
        [["m", "x"], ["z", "y"], ["a", "w"], ["new", "v"]]
    )
    assert result["conflicts"] == ["m", "z", "a"]


def test_reports_conflict_for_duplicate_within_additions():
    from main import bulk_register
    result = bulk_register({}, [["x", "first"], ["y", "yes"], ["x", "second"]])
    assert result["registry"]["x"] == "first"
    assert result["conflicts"] == ["x"]
