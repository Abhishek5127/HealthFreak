import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(__file__))

from context_pack import ContextPack, ProfileEssential, OpenIssue, ActivePlan, LastCall
from agent import HealthFreakCoachAgent, CoachState

class MockSession:
    def __init__(self):
        self.last_instructions = None

    def generate_reply(self, instructions=None):
        self.last_instructions = instructions

async def simulate_turn0(pack: ContextPack, is_anonymous: bool = False) -> str:
    state = CoachState(context_pack=pack, is_anonymous=is_anonymous)
    agent = HealthFreakCoachAgent(instructions="test", coach_state=state)
    session = MockSession()
    mock_activity = type('MockActivity', (), {'session': session})()
    agent._get_activity_or_raise = lambda: mock_activity
    await agent.on_enter()
    return session.last_instructions

async def main():
    print("=== VERIFYING STAGE 3 (TURN 0 OPENING DIRECTIVES) ===\n")

    # 1. Real user (Abhishek): 0 open issues, 2 resolved issues, no active plan
    real_pack = ContextPack(
        profile=ProfileEssential(first_name="Abhishek", language="hinglish", tz="Asia/Kolkata"),
        open_issues=[],
        resolved_recently=[
            {"title": "Shoulder/neck strain", "resolved_at": "12/11/2026"},
            {"title": "Low energy & physical fatigue", "resolved_at": "12/11/2026"}
        ],
    )
    directive_real = await simulate_turn0(real_pack)
    print("1. Real User (Abhishek) Directive:")
    print("  ->", directive_real)
    assert "Resolved" not in directive_real
    assert "Shoulder" not in directive_real
    assert "energy and activity" not in directive_real
    assert "Abhishek" in directive_real
    print("  [PASS] Real user directive asks what they want to work on today; never touches resolved issues.")

    # 2. User with NO name (empty / Friend)
    no_name_pack = ContextPack(
        profile=ProfileEssential(first_name="Friend", language="hinglish"),
        open_issues=[],
    )
    directive_no_name = await simulate_turn0(no_name_pack)
    print("\n2. User with No Name Directive:")
    print("  ->", directive_no_name)
    assert "Abhishek" not in directive_no_name
    assert "Friend" not in directive_no_name
    assert "Greet the user warmly in one short sentence" in directive_no_name
    print("  [PASS] User with no name omits name from greeting directive.")

    # 3. Synthetic user (Alex) with open issue and follow_up_question
    synthetic_pack = ContextPack(
        profile=ProfileEssential(first_name="Alex", language="hinglish"),
        open_issues=[
            OpenIssue(
                id="issue_knee_01",
                title="Right knee soreness",
                category="pain",
                follow_up_question="Aapke right knee ka pain ab kaisa hai?"
            )
        ],
        active_plan=ActivePlan(
            title="4-Week Metabolic Reboot",
            today_workout="Lower body mobility and interval walking"
        )
    )
    directive_synthetic = await simulate_turn0(synthetic_pack)
    print("\n3. Synthetic User (Alex) Directive:")
    print("  ->", directive_synthetic)
    assert "Aapke right knee ka pain ab kaisa hai?" in directive_synthetic
    assert "Alex" in directive_synthetic
    print("  [PASS] Synthetic user follows up on top open issue question.")

    # 4. User with active plan workout hook
    plan_hook_pack = ContextPack(
        profile=ProfileEssential(first_name="Priya", language="hinglish"),
        open_issues=[],
        active_plan=ActivePlan(
            title="Strength Foundation",
            today_workout="Upper body pushups and core plank"
        )
    )
    directive_plan = await simulate_turn0(plan_hook_pack)
    print("\n4. User with Active Plan Hook Directive:")
    print("  ->", directive_plan)
    assert "Upper body pushups and core plank" in directive_plan
    assert "Priya" in directive_plan
    print("  [PASS] Opens on today's planned workout.")

    print("\n=== ALL STAGE 3 SIMULATIONS PASSED ===")

if __name__ == "__main__":
    asyncio.run(main())
