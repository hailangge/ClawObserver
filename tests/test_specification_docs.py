from __future__ import annotations

import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


class SpecificationDocsTests(unittest.TestCase):
    def test_specification_docs_live_under_specification_directory(self) -> None:
        for relative_path in (
            "specification/requirements.md",
            "specification/design.md",
            "specification/tasks.md",
        ):
            self.assertTrue((REPO_ROOT / relative_path).is_file(), relative_path)

    def test_root_level_spec_docs_are_gone(self) -> None:
        for relative_path in ("requirements.md", "design.md", "tasks.md"):
            self.assertFalse((REPO_ROOT / relative_path).exists(), relative_path)

    def test_readme_points_at_specification_docs(self) -> None:
        readme_text = (REPO_ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("specification/requirements.md", readme_text)
        self.assertIn("specification/design.md", readme_text)
        self.assertIn("specification/tasks.md", readme_text)


if __name__ == "__main__":
    unittest.main()
