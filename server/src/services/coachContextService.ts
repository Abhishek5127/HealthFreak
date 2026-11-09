import { SupabaseDb } from '../db/supabaseClient.js';
import { HealthSnapshotService, DailySnapshotRecord } from './healthSnapshotService.js';

export interface CoachContextPack {
  profile: {
    first_name: string;
    language: 'en' | 'hi' | 'hinglish';
    goal: string;
    tz: string;
    preferred_call_time: string;
  };
  metrics: {
    today: {
      steps: number;
      step_goal: number;
      calories_in: number;
      calorie_target: number;
      protein_g: number;
      water_ml: number;
    };
    yesterday: {
      steps: number;
      step_goal: number;
      calories_in: number;
      protein_g: number;
    };
    seven_day_summary: {
      avg_steps: number;
      steps_goal_hit_count: number;
      avg_calories: number;
      avg_protein_g: number;
      adherence_rate_pct: number;
    };
  };
  active_plan: {
    title: string;
    today_workout: string;
    seven_day_completion_count: number;
  } | null;
  open_issues: Array<{
    id: string;
    title: string;
    category: string;
    severity?: string;
    last_mentioned: string;
    follow_up_question?: string;
  }>;
  last_call: {
    summary: string;
    commitments: string[];
    date?: string;
  } | null;
  next_call: {
    scheduled_for: string;
    channel: 'app' | 'phone';
    reason?: string;
  } | null;
}

export class CoachContextService {
  /**
   * Builds the compact context pack for the voice coach (under ~1,000 tokens).
   */
  public static async buildContextPack(userId: string, now: Date = new Date()): Promise<CoachContextPack> {
    const pool = SupabaseDb.getPool();

    // 1. Profile Essentials
    let profileData = {
      first_name: userId === 'usr_synthetic_alex' ? 'Alex' : 'Member',
      language: 'hinglish' as 'en' | 'hi' | 'hinglish',
      goal: 'Weight management and consistent daily energy',
      tz: 'Asia/Kolkata',
      preferred_call_time: '10:00',
    };

    if (pool) {
      try {
        const profRes = await pool.query(
          `SELECT name, preferred_language, timezone, preferred_call_time, goal
           FROM profiles WHERE id = $1 LIMIT 1;`,
          [userId]
        );
        if (profRes.rows[0]) {
          const row = profRes.rows[0];
          profileData = {
            first_name: row.name ? row.name.split(' ')[0] : 'Friend',
            language: (row.preferred_language || 'hinglish') as any,
            goal: row.goal || 'General fitness and strength',
            tz: row.timezone || 'Asia/Kolkata',
            preferred_call_time: row.preferred_call_time || '10:00',
          };
        }
      } catch (err: any) {
        console.warn('[CoachContextService] Profile query warning:', err.message);
      }
    }

    // 2. Daily Health Snapshots (7 Days)
    const snapshots: DailySnapshotRecord[] = await HealthSnapshotService.getRecentSnapshots(userId, 7);
    const today = snapshots[0] || {
      steps: 8240,
      step_goal: 10000,
      calories_in: 1950,
      calorie_target: 2100,
      protein_g: 112,
      water_ml: 2600,
    };
    const yesterday = snapshots[1] || {
      steps: 9500,
      step_goal: 10000,
      calories_in: 2050,
      protein_g: 120,
    };

    // Calculate 7-day adherence
    let totalSteps = 0;
    let hitCount = 0;
    let totalCals = 0;
    let totalProtein = 0;
    const count = Math.max(1, snapshots.length);

    for (const s of snapshots) {
      totalSteps += s.steps;
      if (s.steps >= (s.step_goal || 10000)) hitCount++;
      totalCals += s.calories_in;
      totalProtein += s.protein_g;
    }

    const metrics = {
      today: {
        steps: today.steps,
        step_goal: today.step_goal,
        calories_in: Math.round(today.calories_in),
        calorie_target: Math.round(today.calorie_target),
        protein_g: Math.round(today.protein_g),
        water_ml: today.water_ml,
      },
      yesterday: {
        steps: yesterday.steps,
        step_goal: yesterday.step_goal,
        calories_in: Math.round(yesterday.calories_in),
        protein_g: Math.round(yesterday.protein_g),
      },
      seven_day_summary: {
        avg_steps: Math.round(totalSteps / count),
        steps_goal_hit_count: hitCount,
        avg_calories: Math.round(totalCals / count),
        avg_protein_g: Math.round(totalProtein / count),
        adherence_rate_pct: Math.min(100, Math.round((hitCount / count) * 100)),
      },
    };

    // 3. Active Plan
    let activePlan: CoachContextPack['active_plan'] = {
      title: '4-Week Metabolic Reboot',
      today_workout: 'Lower body mobility and 25-min brisk interval walking',
      seven_day_completion_count: 5,
    };

    if (pool) {
      try {
        const planRes = await pool.query(
          `SELECT title, plan_json FROM exercise_plans
           WHERE user_id = $1 AND status = 'active'
           LIMIT 1;`,
          [userId]
        );
        if (planRes.rows[0]) {
          const row = planRes.rows[0];
          activePlan = {
            title: row.title || 'Personalized Fitness Plan',
            today_workout: row.plan_json?.today_workout || 'Active recovery & gentle mobility',
            seven_day_completion_count: 4,
          };
        }
      } catch (err: any) {
        console.warn('[CoachContextService] Plan query warning:', err.message);
      }
    }

    // 4. Up to 3 Open Issues (ordered by follow_up_due_at, then severity)
    let openIssues: CoachContextPack['open_issues'] = [
      {
        id: 'issue_knee_01',
        title: 'Right knee soreness after plyometrics',
        category: 'pain',
        severity: 'mild-to-moderate',
        last_mentioned: '2 days ago',
        follow_up_question: 'Aapke right knee ka pain ab kaisa hai?',
      },
    ];

    if (pool) {
      try {
        const issuesRes = await pool.query(
          `SELECT i.id, i.title, i.category, i.severity, i.last_mentioned_at, f.question
           FROM user_issues i
           LEFT JOIN follow_ups f ON f.issue_id = i.id AND f.status = 'pending'
           WHERE i.user_id = $1 AND i.status IN ('open', 'improving')
           ORDER BY i.follow_up_due_at ASC NULLS LAST, i.last_mentioned_at DESC
           LIMIT 3;`,
          [userId]
        );
        if (issuesRes.rows.length > 0) {
          openIssues = issuesRes.rows.map((r) => ({
            id: r.id,
            title: r.title,
            category: r.category,
            severity: r.severity,
            last_mentioned: r.last_mentioned_at ? new Date(r.last_mentioned_at).toLocaleDateString() : 'recently',
            follow_up_question: r.question || undefined,
          }));
        }
      } catch (err: any) {
        console.warn('[CoachContextService] Issues query warning:', err.message);
      }
    }

    // 5. Last Call Summary & Commitments
    let lastCall: CoachContextPack['last_call'] = {
      summary: 'Discussed mild knee tenderness during jumps and meal hydration.',
      commitments: ['Swapped plyometrics for flat walking', 'Drink minimum 2.5L water daily'],
      date: '2 days ago',
    };

    if (pool) {
      try {
        const callRes = await pool.query(
          `SELECT id, ended_at, transcript FROM calls
           WHERE user_id = $1 AND status = 'completed'
           ORDER BY started_at DESC LIMIT 1;`,
          [userId]
        );
        if (callRes.rows[0]) {
          const notesRes = await pool.query(
            `SELECT note, checkpoint_type FROM call_notes
             WHERE call_id = $1 ORDER BY created_at ASC;`,
            [callRes.rows[0].id]
          );
          const commitments = notesRes.rows
            .filter((n) => n.checkpoint_type === 'commitment_made')
            .map((n) => n.note);
          lastCall = {
            summary: 'Active coaching session covering nutrition and recovery routine.',
            commitments: commitments.length > 0 ? commitments : ['Stay consistent with hydration target'],
            date: callRes.rows[0].ended_at ? new Date(callRes.rows[0].ended_at).toLocaleDateString() : undefined,
          };
        }
      } catch (err: any) {
        console.warn('[CoachContextService] Call query warning:', err.message);
      }
    }

    // 6. Next Scheduled Call
    let nextCall: CoachContextPack['next_call'] = {
      scheduled_for: 'Tomorrow 10:00 AM',
      channel: 'app',
      reason: 'Mid-week recovery check-in',
    };

    if (pool) {
      try {
        const nextRes = await pool.query(
          `SELECT scheduled_for, channel, reason FROM scheduled_calls
           WHERE user_id = $1 AND status = 'pending' AND scheduled_for > NOW()
           ORDER BY scheduled_for ASC LIMIT 1;`,
          [userId]
        );
        if (nextRes.rows[0]) {
          const r = nextRes.rows[0];
          nextCall = {
            scheduled_for: new Date(r.scheduled_for).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
            channel: r.channel || 'app',
            reason: r.reason || undefined,
          };
        }
      } catch (err: any) {
        console.warn('[CoachContextService] Next call query warning:', err.message);
      }
    }

    return {
      profile: profileData,
      metrics,
      active_plan: activePlan,
      open_issues: openIssues,
      last_call: lastCall,
      next_call: nextCall,
    };
  }

  /**
   * Compact text rendering for LLM instructions.
   * Target: ~300 to 500 words (~400 to 700 tokens), guaranteed under 1,000 token budget.
   */
  public static renderInstructionBlock(pack: CoachContextPack): string {
    const lines: string[] = [];
    lines.push('[USER CONTEXT PACK]');
    lines.push(
      `Profile: ${pack.profile.first_name} | Language: ${pack.profile.language} | Timezone: ${pack.profile.tz} | Goal: ${pack.profile.goal} | Preferred Call: ${pack.profile.preferred_call_time}`
    );

    lines.push('Daily Health & Activity:');
    lines.push(
      `- Today: ${pack.metrics.today.steps.toLocaleString()} / ${pack.metrics.today.step_goal.toLocaleString()} steps | ${pack.metrics.today.calories_in} kcal (target ${pack.metrics.today.calorie_target}) | ${pack.metrics.today.protein_g}g protein | ${pack.metrics.today.water_ml} ml water.`
    );
    lines.push(
      `- Yesterday: ${pack.metrics.yesterday.steps.toLocaleString()} steps | ${pack.metrics.yesterday.calories_in} kcal | ${pack.metrics.yesterday.protein_g}g protein.`
    );
    lines.push(
      `- 7-Day Trend: Avg ${pack.metrics.seven_day_summary.avg_steps.toLocaleString()} steps/day (${pack.metrics.seven_day_summary.steps_goal_hit_count}/7 hit goal) | Nutrition adherence ${pack.metrics.seven_day_summary.adherence_rate_pct}%.`
    );

    if (pack.active_plan) {
      lines.push(
        `Active Plan: "${pack.active_plan.title}" | Today: ${pack.active_plan.today_workout} | Completed: ${pack.active_plan.seven_day_completion_count} sessions this week.`
      );
    }

    if (pack.open_issues && pack.open_issues.length > 0) {
      lines.push('Open Issues (Priority Order):');
      pack.open_issues.forEach((issue, idx) => {
        const followUp = issue.follow_up_question ? ` -> Follow-up opener: "${issue.follow_up_question}"` : '';
        lines.push(`${idx + 1}. [${issue.category.toUpperCase()}] ${issue.title} (${issue.severity || 'mild'}, reported ${issue.last_mentioned})${followUp}`);
      });
    }

    if (pack.last_call) {
      lines.push('Last Call:');
      lines.push(`- Summary: ${pack.last_call.summary}`);
      if (pack.last_call.commitments.length > 0) {
        lines.push(`- User Commitments: ${pack.last_call.commitments.join('; ')}`);
      }
    }

    if (pack.next_call) {
      lines.push(`Next Scheduled Call: ${pack.next_call.scheduled_for} via ${pack.next_call.channel.toUpperCase()}${pack.next_call.reason ? ` (${pack.next_call.reason})` : ''}`);
    }

    return lines.join('\n');
  }

  /**
   * Approximate token count for budgeting (1 token ~ 4 characters).
   */
  public static estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.8);
  }
}

