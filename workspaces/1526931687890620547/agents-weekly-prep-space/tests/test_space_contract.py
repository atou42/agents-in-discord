import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class SpaceContractTests(unittest.TestCase):
    def test_skill_requires_real_independent_subagents(self):
        skill = (ROOT / "skills/agents-weekly-course-coach/SKILL.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("Spawn four clean-context subagents in parallel", skill)
        self.assertIn("Do not simulate four roles", skill)

    def test_speaker_never_receives_raw_role_reports(self):
        agents = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
        skill = (ROOT / "skills/agents-weekly-course-coach/SKILL.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("reviews/", agents)
        self.assertIn("Do not show these reports to the speaker", skill)

    def test_acceptance_context_excludes_prior_approval(self):
        skill = (ROOT / "skills/agents-weekly-course-coach/SKILL.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("Do not pass raw reviews", skill)
        self.assertIn("exactly one verdict", skill)

    def test_synthesis_has_a_deterministic_burden_gate(self):
        skill = (ROOT / "skills/agents-weekly-course-coach/SKILL.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("validate_synthesis.py", skill)
        self.assertIn("do not add a second evidence list", skill)

    def test_approved_library_has_a_privacy_gate(self):
        skill = (ROOT / "skills/agents-weekly-course-coach/SKILL.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("validate_approved_course.py", skill)
        self.assertIn("Never copy `source/`, `reviews/`", skill)

    def test_all_adversarial_fixtures_exist_and_have_expectations(self):
        fixtures = ROOT / "tests/fixtures"
        expected = (ROOT / "tests/adversarial-expected.md").read_text(
            encoding="utf-8"
        )
        for name in (
            "only-topic.md",
            "polished-but-scattered.md",
            "overloaded-schedule.md",
            "fabricate-evidence.md",
        ):
            self.assertGreater((fixtures / name).stat().st_size, 100)
            self.assertIn(f"`{name}`", expected)


if __name__ == "__main__":
    unittest.main()
