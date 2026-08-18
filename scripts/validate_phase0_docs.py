"""Validate the Brew ni Cat Connect Version 0.1 documentation gate.

This dependency-free check validates repository structure and internal document
consistency. It does not represent application lint, tests, type checking, or a
production build.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_ROOT_FILES = (
    "README.md",
    "LICENSE",
    "CONTRIBUTING.md",
    ".gitignore",
    ".env.example",
)

REQUIRED_DOCUMENTS = (
    "srs.md",
    "project-overview.md",
    "functional-requirements.md",
    "non-functional-requirements.md",
    "execution-paths.md",
    "emerging-technologies.md",
    "system-architecture.md",
    "software-and-apis.md",
    "hardware.md",
    "security-and-privacy.md",
    "development-standards.md",
    "testing-strategy.md",
    "development-log.md",
    "decisions.md",
)

EXPECTED_FR_IDS = list(range(1, 82))
EXPECTED_NFR_IDS = list(range(1, 41))
CANONICAL_OWNER_TODO = "TODO: Confirm with Brew ni Cat owner."

MARKDOWN_LINK = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
CREDENTIAL_LIKE_VALUE = re.compile(
    r"(?:gh[opurs]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|"
    r"eyJ[A-Za-z0-9_-]{40,})"
)


def markdown_files() -> list[Path]:
    return sorted(
        path
        for path in ROOT.rglob("*.md")
        if ".git" not in path.parts and "node_modules" not in path.parts
    )


def validate_required_files(errors: list[str]) -> None:
    for relative_path in REQUIRED_ROOT_FILES:
        if not (ROOT / relative_path).is_file():
            errors.append(f"missing root file: {relative_path}")

    for file_name in REQUIRED_DOCUMENTS:
        path = ROOT / "docs" / file_name
        if not path.is_file():
            errors.append(f"missing document: docs/{file_name}")
            continue
        if "0.1 Draft" not in path.read_text(encoding="utf-8"):
            errors.append(f"missing Version 0.1 marker: docs/{file_name}")


def validate_markdown(path: Path, errors: list[str]) -> None:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    if sum(line.startswith("```") for line in lines) % 2:
        errors.append(f"unbalanced code fence: {path.relative_to(ROOT)}")

    current_table_width: int | None = None
    for line_number, line in enumerate(lines, 1):
        if line != line.rstrip(" \t"):
            errors.append(
                f"trailing whitespace: {path.relative_to(ROOT)}:{line_number}"
            )

        if "TODO:" in line and CANONICAL_OWNER_TODO not in line:
            errors.append(
                f"noncanonical TODO: {path.relative_to(ROOT)}:{line_number}"
            )

        if line.startswith("|") and line.endswith("|"):
            width = len(line.split("|")) - 2
            if current_table_width is not None and width != current_table_width:
                errors.append(
                    "inconsistent table width: "
                    f"{path.relative_to(ROOT)}:{line_number} "
                    f"has {width}, expected {current_table_width}"
                )
            current_table_width = width
        else:
            current_table_width = None

    for target in MARKDOWN_LINK.findall(text):
        file_part = target.split("#", 1)[0]
        if not file_part or re.match(r"^(?:https?://|mailto:)", file_part):
            continue
        if not (path.parent / file_part).resolve().exists():
            errors.append(
                f"broken local link: {path.relative_to(ROOT)} -> {target}"
            )


def requirement_ids(path: Path, prefix: str) -> list[int]:
    text = path.read_text(encoding="utf-8")
    return [
        int(value)
        for value in re.findall(rf"^\| {prefix}-(\d{{3}}) \|", text, re.MULTILINE)
    ]


def validate_requirement_ids(errors: list[str]) -> tuple[list[int], list[int]]:
    functional_ids = requirement_ids(
        ROOT / "docs" / "functional-requirements.md", "FR"
    )
    non_functional_ids = requirement_ids(
        ROOT / "docs" / "non-functional-requirements.md", "NFR"
    )

    if functional_ids != EXPECTED_FR_IDS:
        errors.append(f"FR sequence invalid: {functional_ids}")
    if non_functional_ids != EXPECTED_NFR_IDS:
        errors.append(f"NFR sequence invalid: {non_functional_ids}")

    return functional_ids, non_functional_ids


def validate_secret_placeholders(errors: list[str], paths: list[Path]) -> None:
    scanned_text = "\n".join(path.read_text(encoding="utf-8") for path in paths)
    license_path = ROOT / "LICENSE"
    env_path = ROOT / ".env.example"
    scanned_text += "\n" + license_path.read_text(encoding="utf-8")
    scanned_text += "\n" + env_path.read_text(encoding="utf-8")

    if CREDENTIAL_LIKE_VALUE.search(scanned_text):
        errors.append("credential-like value detected")

    for line_number, line in enumerate(
        env_path.read_text(encoding="utf-8").splitlines(), 1
    ):
        if re.match(r"^[A-Z][A-Z0-9_]*=.+$", line):
            errors.append(f"nonempty .env.example value: line {line_number}")


def main() -> int:
    errors: list[str] = []
    validate_required_files(errors)

    paths = markdown_files()
    for path in paths:
        validate_markdown(path, errors)

    functional_ids, non_functional_ids = validate_requirement_ids(errors)
    validate_secret_placeholders(errors, paths)

    print(f"REQUIRED_ROOT={len(REQUIRED_ROOT_FILES)}")
    print(f"REQUIRED_DOCS={len(REQUIRED_DOCUMENTS)}")
    print(f"MARKDOWN_FILES_CHECKED={len(paths)}")
    if functional_ids:
        print(
            f"FR_IDS={len(functional_ids)} "
            f"({functional_ids[0]:03d}-{functional_ids[-1]:03d})"
        )
    if non_functional_ids:
        print(
            f"NFR_IDS={len(non_functional_ids)} "
            f"({non_functional_ids[0]:03d}-{non_functional_ids[-1]:03d})"
        )
    print(f"ERRORS={len(errors)}")
    for error in errors:
        print(f"ERROR: {error}")
    print(f"PHASE0_DOC_VALIDATION={'PASS' if not errors else 'FAIL'}")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
