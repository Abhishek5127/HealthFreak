"""
HealthFreak Voice AI Coach - Compact Context Pack Schema & Builder
Maintains an ultra-compact context pack (<1,000 tokens) rendered into agent instructions.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator

class ProfileEssential(BaseModel):
    first_name: str = "Friend"
    language: str = "hinglish"
    goal: str = "Healthy lifestyle & wellness"
    tz: str = "Asia/Kolkata"
    preferred_call_time: str = "10:00"

class DayMetrics(BaseModel):
    steps: int = 0
    step_goal: int = 10000
    calories_in: int = 0
    calorie_target: int = 2000
    protein_g: int = 0
    water_ml: int = 0

class SevenDaySummary(BaseModel):
    avg_steps: int = 0
    steps_goal_hit_count: int = 0
    avg_calories: int = 0
    avg_protein_g: int = 0
    adherence_rate_pct: int = 0

class ActivePlan(BaseModel):
    title: str
    today_workout: str
    seven_day_completion_count: int = 0

class OpenIssue(BaseModel):
    id: str
    title: str
    category: str = "other"
    severity: Optional[str] = "mild"
    last_mentioned: str = "recently"
    follow_up_question: Optional[str] = None

class ResolvedIssue(BaseModel):
    title: str
    resolved_at: str

class LastCall(BaseModel):
    summary: str
    commitments: List[str] = Field(default_factory=list)
    date: Optional[str] = None

class NextCall(BaseModel):
    scheduled_for: str
    channel: str = "app"
    reason: Optional[str] = None

class ContextPack(BaseModel):
    profile: ProfileEssential = Field(default_factory=ProfileEssential)
    today: DayMetrics = Field(default_factory=DayMetrics)
    yesterday: Optional[DayMetrics] = None
    seven_day_summary: Optional[SevenDaySummary] = None
    active_plan: Optional[ActivePlan] = None
    open_issues: List[OpenIssue] = Field(default_factory=list)
    resolved_recently: List[ResolvedIssue] = Field(default_factory=list)
    last_call: Optional[LastCall] = None
    next_call: Optional[NextCall] = None

    @model_validator(mode='before')
    @classmethod
    def _flatten_metrics(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "metrics" in data and isinstance(data["metrics"], dict):
                m = data["metrics"]
                if "today" in m and "today" not in data:
                    data["today"] = m["today"]
                if "yesterday" in m and "yesterday" not in data:
                    data["yesterday"] = m["yesterday"]
                if "seven_day_summary" in m and "seven_day_summary" not in data:
                    data["seven_day_summary"] = m["seven_day_summary"]
        return data

    def render_prompt_text(self) -> str:
        lines = ["[USER CONTEXT PACK]"]
        lines.append(
            f"User: (name omitted) | Language: {self.profile.language} | "
            f"Timezone: {self.profile.tz} | Goal: {self.profile.goal} | Preferred Call: {self.profile.preferred_call_time}"
        )
        lines.append("Daily Health & Activity:")
        lines.append(
            f"- Today: {self.today.steps:,} / {self.today.step_goal:,} steps | "
            f"{self.today.calories_in} kcal (target {self.today.calorie_target}) | "
            f"{self.today.protein_g}g protein | {self.today.water_ml} ml water."
        )
        if self.yesterday:
            lines.append(
                f"- Yesterday: {self.yesterday.steps:,} steps | "
                f"{self.yesterday.calories_in} kcal | {self.yesterday.protein_g}g protein."
            )
        if self.seven_day_summary and self.seven_day_summary.avg_steps > 0:
            lines.append(
                f"- 7-Day Trend: Avg {self.seven_day_summary.avg_steps:,} steps/day "
                f"({self.seven_day_summary.steps_goal_hit_count}/7 hit goal) | "
                f"Nutrition adherence {self.seven_day_summary.adherence_rate_pct}%."
            )

        if self.active_plan:
            lines.append(
                f'Active Plan: "{self.active_plan.title}" | Today: {self.active_plan.today_workout} | '
                f"Completed {self.active_plan.seven_day_completion_count} sessions this week."
            )
        else:
            lines.append("Active Plan: none. Offer to build one when relevant.")

        if self.open_issues:
            lines.append("Open Issues (Priority Order):")
            for idx, issue in enumerate(self.open_issues[:3], 1):
                opener = f' -> Opener Question: "{issue.follow_up_question}"' if issue.follow_up_question else ""
                lines.append(
                    f"{idx}. [id:{issue.id[:8]}] [{issue.category.upper()}] {issue.title} "
                    f"({issue.severity or 'mild'}, reported {issue.last_mentioned}){opener}"
                )

        if self.resolved_recently:
            lines.append("Resolved recently (do NOT bring up unless the user does; if the same pain returns, ask whether it feels like before):")
            for idx, issue in enumerate(self.resolved_recently[:3], 1):
                lines.append(f"{idx}. {issue.title} (Resolved: {issue.resolved_at})")

        if self.last_call:
            lines.append(f"Last Call: {self.last_call.summary}")
            if self.last_call.commitments:
                lines.append(f"- User Commitments: {'; '.join(self.last_call.commitments)}")

        if self.next_call:
            lines.append(
                f"Next Call: {self.next_call.scheduled_for} via {self.next_call.channel.upper()}"
                + (f" ({self.next_call.reason})" if self.next_call.reason else "")
            )

        return "\n".join(lines)

    def estimate_tokens(self) -> int:
        # 1 token ~ 3.8 characters in Indian Hinglish / English mixed strings
        return int(len(self.render_prompt_text()) / 3.8)

@dataclass
class CoachState:
    user_id: Optional[str] = None
    call_id: Optional[str] = None
    purpose: str = "checkin"
    scheduled_call_id: Optional[str] = None
    context_pack: Optional[ContextPack] = None
    issues_touched: List[str] = field(default_factory=list)
    commitments: List[str] = field(default_factory=list)
    language: str = "hi-IN"
    is_anonymous: bool = False
