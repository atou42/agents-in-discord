import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "scripts" / "validate_course_package.py"


def valid_package():
    return {
        "course": {
            "title": "让 Agent 交付真实结果",
            "promise": "听众将学会用证据判断 Agent 是否真的完成任务",
            "audience": "已经在工作中使用 Agent 的同事",
            "talk_minutes": 30,
            "qa_minutes": 5,
        },
        "takeaways": [
            {
                "title": "先定义可观察的完成标准",
                "support": {
                    "type": "case",
                    "description": "用一次部署后页面打不开的真实复盘说明",
                },
            },
            {
                "title": "用失败路径检验结果",
                "support": {
                    "type": "demo",
                    "description": "现场向脚本传入损坏输入并查看报错",
                },
            },
        ],
        "segments": [
            {
                "kind": "opening",
                "title": "为什么看起来完成还不够",
                "minutes": 3,
                "purpose": "建立听课动机",
            },
            {
                "kind": "content",
                "title": "完成标准",
                "minutes": 10,
                "purpose": "讲清第一项收获",
                "takeaway_index": 1,
            },
            {
                "kind": "demo",
                "title": "失败路径演示",
                "minutes": 12,
                "purpose": "证明第二项收获",
                "takeaway_index": 2,
            },
            {
                "kind": "summary",
                "title": "回收主线",
                "minutes": 5,
                "purpose": "帮助听众复述",
            },
        ],
        "qa": [
            {
                "question": "时间有限时先验什么？",
                "answer_direction": "先验用户能否拿到结果，再验最危险的失败路径",
            }
        ],
        "recall_questions": [
            {"question": "完成标准要满足什么？", "expected_answer": "必须可观察"},
            {"question": "为什么要测试失败路径？", "expected_answer": "防止坏输入被伪装成成功"},
            {"question": "先验证哪类结果？", "expected_answer": "用户真正拿到的结果"},
        ],
        "status": "ready",
    }


class ValidateCoursePackageTests(unittest.TestCase):
    def run_validator(self, payload=None, raw=None):
        with tempfile.TemporaryDirectory() as temp_dir:
            package_path = Path(temp_dir) / "course-package.json"
            if raw is not None:
                package_path.write_text(raw, encoding="utf-8")
            else:
                package_path.write_text(
                    json.dumps(payload, ensure_ascii=False), encoding="utf-8"
                )
            return subprocess.run(
                ["python3", str(VALIDATOR), str(package_path)],
                capture_output=True,
                text=True,
                check=False,
            )

    def test_accepts_complete_course_package(self):
        result = self.run_validator(valid_package())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("PASS", result.stdout)

    def test_rejects_more_than_three_takeaways(self):
        package = valid_package()
        package["takeaways"] = package["takeaways"] * 2
        result = self.run_validator(package)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("takeaways must contain 1 to 3 items", result.stderr)

    def test_rejects_takeaway_without_concrete_support(self):
        package = valid_package()
        package["takeaways"][0]["support"]["description"] = ""
        result = self.run_validator(package)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("support.description", result.stderr)

    def test_rejects_talk_plan_that_overruns(self):
        package = valid_package()
        package["segments"][2]["minutes"] = 20
        result = self.run_validator(package)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("segment minutes total 38 exceeds talk_minutes 30", result.stderr)

    def test_rejects_invalid_json_without_rewriting_it(self):
        result = self.run_validator(raw="{broken")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("invalid JSON", result.stderr)

    def test_rejects_ready_package_with_missing_recall_question(self):
        package = valid_package()
        package["recall_questions"].pop()
        result = self.run_validator(package)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("recall_questions must contain exactly 3 items", result.stderr)


if __name__ == "__main__":
    unittest.main()
