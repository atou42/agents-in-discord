import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "scripts" / "validate_synthesis.py"


def valid_synthesis():
    return {
        "course_id": "example-course",
        "status": "needs_revision",
        "current_main_line": "Listeners can run a focused multi-Agent review on time.",
        "what_works": ["The audience and duration are explicit."],
        "blocking_changes": [
            {
                "title": "Replace the overloaded schedule",
                "why": "The talk contains 73 minutes of material for a 40-minute slot.",
                "replacement": "Use a complete 40-minute schedule and keep Q&A separate.",
                "speaker_action": "Confirm the 40-minute replacement schedule.",
            },
            {
                "title": "Supply one real failure",
                "why": "The draft names a failure review without source material.",
                "replacement": "Use one sourced failure or label the section as patterns only.",
                "speaker_action": "Provide one real failure or choose patterns only.",
            },
        ],
        "revised_schedule": [
            {"title": "Opening", "minutes": 3},
            {"title": "Method", "minutes": 32},
            {"title": "Summary", "minutes": 5},
        ],
    }


class ValidateSynthesisTests(unittest.TestCase):
    def run_validator(self, payload):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "synthesis.json"
            path.write_text(json.dumps(payload), encoding="utf-8")
            return subprocess.run(
                ["python3", str(VALIDATOR), str(path)],
                capture_output=True,
                text=True,
                check=False,
            )

    def test_accepts_three_or_fewer_complete_blockers(self):
        result = self.run_validator(valid_synthesis())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("PASS", result.stdout)

    def test_rejects_more_than_three_speaker_actions(self):
        synthesis = valid_synthesis()
        synthesis["blocking_changes"] = synthesis["blocking_changes"] * 2
        result = self.run_validator(synthesis)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("blocking_changes must contain 0 to 3 items", result.stderr)

    def test_rejects_hidden_extra_action_list(self):
        synthesis = valid_synthesis()
        synthesis["evidence_still_needed"] = ["one", "two", "three", "four"]
        result = self.run_validator(synthesis)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unexpected root field evidence_still_needed", result.stderr)

    def test_rejects_blocker_without_directly_usable_replacement(self):
        synthesis = valid_synthesis()
        synthesis["blocking_changes"][0]["replacement"] = ""
        result = self.run_validator(synthesis)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("replacement must be a non-empty string", result.stderr)


if __name__ == "__main__":
    unittest.main()
