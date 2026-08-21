"""Generated-artifact manifest (development plan, M0).

Every deployment-safe artifact under ``public/generated/`` is described by a
manifest carrying the schema version, build time, and a SHA-256 checksum per
input, so downstream consumers can verify exactly which inputs produced what
they are reading.
"""

from __future__ import annotations

import hashlib
from collections.abc import Mapping
from typing import TypedDict


class Manifest(TypedDict):
    schema_version: str
    build_time: str
    inputs: dict[str, str]


def build_manifest(
    schema_version: str,
    build_time: str,
    inputs: Mapping[str, bytes],
) -> Manifest:
    """Build a deterministic manifest for a set of raw input payloads.

    ``inputs`` maps a stable input name (for example a relative file path) to
    its exact bytes. Keys are emitted sorted so the manifest is byte-stable
    for identical inputs regardless of insertion order.
    """
    if not schema_version:
        raise ValueError("schema_version must be a non-empty string")
    if not build_time:
        raise ValueError("build_time must be a non-empty string")

    checksums = {
        name: hashlib.sha256(payload).hexdigest() for name, payload in sorted(inputs.items())
    }
    return Manifest(
        schema_version=schema_version,
        build_time=build_time,
        inputs=checksums,
    )
