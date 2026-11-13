"""
Unit test for HealthFreak Voice AI Coach Context Pack
Verifies content formatting, schema integrity, and token budget (<1,000 tokens).
"""
import unittest
from context_pack import (
    ContextPack,
    ProfileEssential,
    DayMetrics,
    SevenDaySummary,
    ActivePlan,
    OpenIssue,
    LastCall,
    NextCall,
)

class TestContextPack(unittest.TestCase):
    def test_context_pack_token_budget_and_formatting(self):
        pack = ContextPack(
            profile=ProfileEssential(
                first_name="Alex",
                language="hinglish",
                goal="Fat loss & functional knee stability",
                tz="Asia/Kolkata",
                preferred_call_time="10:00",
            ),
            today=DayMetrics(
                steps=8240,
                step_goal=10000,
                calories_in=1950,
                calorie_target=2100,
                protein_g=112,
                water_ml=2600,
            ),
            yesterday=DayMetrics(
                steps=9500,
                step_goal=10000,
                calories_in=2050,
                protein_g=120,
            ),
            seven_day_summary=SevenDaySummary(
                avg_steps=8750,
                steps_goal_hit_count=5,
                avg_calories=2010,
                avg_protein_g=115,
                adherence_rate_pct=82,
            ),
            active_plan=ActivePlan(
                title="4-Week Metabolic Reboot",
                today_workout="Lower body mobility and 25-min brisk interval walking",
                seven_day_completion_count=4,
            ),
            open_issues=[
                OpenIssue(
                    id="issue_knee_01",
                    title="Right patellar knee tenderness after jumping",
                    category="pain",
                    severity="moderate",
                    last_mentioned="2 days ago",
                    follow_up_question="Aapke right knee ka pain jumping ke baad ab kaisa hai?",
                ),
                OpenIssue(
                    id="issue_sleep_02",
                    title="Waking up unrested around 4 AM",
                    category="sleep",
                    severity="mild",
                    last_mentioned="3 days ago",
                    follow_up_question="Neend continuous aa rahi hai ya abhi bhi break ho rahi hai?",
                ),
            ],
            last_call=LastCall(
                summary="Addressed knee soreness during plyometrics, agreed on low-impact cardio.",
                commitments=["Stick to brisk walking on treadmill", "Drink minimum 2.5L water daily"],
                date="2 days ago",
            ),
            next_call=NextCall(
                scheduled_for="Tomorrow 10:00 AM",
                channel="app",
                reason="Mid-week recovery review",
            ),
        )

        rendered = pack.render_prompt_text()
        estimated_tokens = pack.estimate_tokens()

        print("\n--- RENDERED CONTEXT PACK ---")
        print(rendered)
        print(f"\nEstimated tokens: {estimated_tokens} (Target: < 1,000 tokens)")

        # Assertions
        self.assertIn("[USER CONTEXT PACK]", rendered)
        self.assertIn("(name omitted)", rendered)
        self.assertIn("8,240 / 10,000 steps", rendered)
        self.assertIn("Right patellar knee tenderness", rendered)
        self.assertIn("Aapke right knee ka pain", rendered)
        # Verify Token Budget
        self.assertLess(estimated_tokens, 1000, f"Token budget exceeded: {estimated_tokens} >= 1000")
        # Ensure it's substantial (> 50 tokens) but well under 1,000
        self.assertGreater(estimated_tokens, 80)

if __name__ == "__main__":
    unittest.main()

