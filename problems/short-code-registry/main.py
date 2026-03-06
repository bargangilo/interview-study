"""
Build a registry mapping short codes to their full values.
"""


def build_registry(entries: list[list[str]]) -> dict:
    """Build a registry from [code, value] pairs. First occurrence wins for duplicates."""
    pass


def lookup_code(registry: dict, code: str) -> str | None:
    """Look up a code in the registry. Returns None if not found."""
    pass
