import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "scripts" / "validate_approved_course.py"
ALLOWED = ("course-package.json", "acceptance.md", "recall-questions.md")


class ValidateApprovedCourseTests(unittest.TestCase):
    def run_validator(self, extras=(), missing=()):
        with tempfile.TemporaryDirectory() as temp_dir:
            course_dir = Path(temp_dir) / "approved-course"
            course_dir.mkdir()
            for name in ALLOWED:
                if name not in missing:
                    (course_dir / name).write_text("non-empty", encoding="utf-8")
            for name in extras:
                path = course_dir / name
                if name.endswith("/"):
                    path.mkdir(parents=True)
                    (path / "raw.md").write_text("private", encoding="utf-8")
                else:
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_text("unexpected", encoding="utf-8")
            return subprocess.run(
                ["python3", str(VALIDATOR), str(course_dir)],
                capture_output=True,
                text=True,
                check=False,
            )

    def test_accepts_only_curated_approved_files(self):
        result = self.run_validator()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("PASS", result.stdout)

    def test_rejects_private_review_directory(self):
        result = self.run_validator(extras=("reviews/",))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unexpected approved entry: reviews", result.stderr)

    def test_rejects_source_and_drafts(self):
        result = self.run_validator(extras=("source/", "course-package.draft.md"))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unexpected approved entry: source", result.stderr)
        self.assertIn("unexpected approved entry: course-package.draft.md", result.stderr)

    def test_rejects_missing_acceptance(self):
        result = self.run_validator(missing=("acceptance.md",))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("missing approved entry: acceptance.md", result.stderr)


if __name__ == "__main__":
    unittest.main()
