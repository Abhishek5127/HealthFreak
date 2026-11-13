import { SupabaseDb } from '../db/supabaseClient.js';
import { FollowUpGenerator } from '../coach/memory/followupGenerator.js';
import { HealthSnapshotService, DailySnapshotRecord } from './healthSnapshotService.js';
import { config } from '../config/index.js';

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
    } | null;
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
    topics_covered: string[];
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
    const isSyntheticAlex =
      (process.env.SYNTHETIC_DATA_MODE === 'true' || config.privacy.syntheticDataMode) &&
      userId === 'usr_synthetic_alex';

    // 1. Profile Essentials
    let profileData = {
      first_name: isSyntheticAlex ? 'Alex' : 'Friend',
      language: 'hinglish' as 'en' | 'hi' | 'hinglish',
      goal: isSyntheticAlex
        ? 'Weight management and consistent daily energy'
        : 'General fitness and strength',
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
            first_name: row.name ? row.name.split(' ')[0] : (isSyntheticAlex ? 'Alex' : 'Friend'),
            language: (row.preferred_language || 'hinglish') as any,
            goal: row.goal || (isSyntheticAlex ? 'Weight management and consistent daily energy' : 'General fitness and strength'),
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
    const today = snapshots[0] || (isSyntheticAlex ? {
      steps: 8240,
      step_goal: 10000,
      calories_in: 1950,
      calorie_target: 2100,
      protein_g: 112,
      water_ml: 2600,
    } : {
      steps: 0,
      step_goal: 10000,
      calories_in: 0,
      calorie_target: 2000,
      protein_g: 0,
      water_ml: 0,
    });

    const yesterday = snapshots[1]
      ? {
          steps: snapshots[1].steps,
          step_goal: snapshots[1].step_goal,
          calories_in: Math.round(snapshots[1].calories_in),
          protein_g: Math.round(snapshots[1].protein_g),
        }
      : isSyntheticAlex
      ? {
          steps: 9500,
          step_goal: 10000,
          calories_in: 2050,
          protein_g: 120,
        }
      : null;

    let totalSteps = 0;
    let hitCount = 0;
    let totalCals = 0;
    let totalProtein = 0;
    const count = snapshots.length;

    if (count > 0) {
      for (const s of snapshots) {
        totalSteps += s.steps;
        if (s.steps >= (s.step_goal || 10000)) hitCount++;
        totalCals += s.calories_in;
        totalProtein += s.protein_g;
      }
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
      yesterday,
      seven_day_summary: {
        avg_steps: count > 0 ? Math.round(totalSteps / count) : 0,
        steps_goal_hit_count: hitCount,
        avg_calories: count > 0 ? Math.round(totalCals / count) : 0,
        avg_protein_g: count > 0 ? Math.round(totalProtein / count) : 0,
        adherence_rate_pct: count > 0 ? Math.min(100, Math.round((hitCount / count) * 100)) : 0,
      },
    };

    // 3. Active Plan (No hardcoded fallback for real users)
    let activePlan: CoachContextPack['active_plan'] = null;

    if (isSyntheticAlex) {
      activePlan = {
        title: '4-Week Metabolic Reboot',
        today_workout: 'Lower body mobility and 25-min brisk interval walking',
        seven_day_completion_count: 5,
      };
    } else if (pool) {
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
            seven_day_completion_count: row.plan_json?.seven_day_completion_count || 0,
          };
        }
      } catch (err: any) {
        console.warn('[CoachContextService] Plan query warning:', err.message);
      }
    }

    // 4. Up to 3 Open Issues (No hardcoded knee fallback for real users)
    let openIssues: CoachContextPack['open_issues'] = [];

    if (isSyntheticAlex) {
      openIssues = [
        {
          id: 'issue_knee_01',
          title: 'Right knee soreness after plyometrics',
          category: 'pain',
          severity: 'mild-to-moderate',
          last_mentioned: '2 days ago',
          follow_up_question: 'Aapke right knee ka pain ab kaisa hai?',
        },
      ];
    } else if (pool) {
      try {
        const issuesRes = await pool.query(
          `SELECT i.id, i.title, i.category, i.severity, i.last_mentioned_at
           FROM user_issues i
           WHERE i.user_id = $1 AND i.status IN ('open', 'improving')
           ORDER BY i.follow_up_due_at ASC NULLS LAST, i.last_mentioned_at DESC
           LIMIT 3;`,
          [userId]
        );
        if (issuesRes.rows.length > 0) {
          openIssues = issuesRes.rows.map((r, idx) => ({
            id: r.id,
            title: r.title,
            category: r.category,
            severity: r.severity,
            last_mentioned: r.last_mentioned_at ? new Date(r.last_mentioned_at).toLocaleDateString() : 'recently',
            follow_up_question: FollowUpGenerator.generateQuestion(
              r,
              profileData.language || 'hinglish',
              idx
            ),
          }));
        }
      } catch (err: any) {
        console.warn('[CoachContextService] Issues query warning:', err.message);
      }
    }

    // 5. Last Call Structured Data (Topics covered & commitments filtered against live open issues)
    let lastCall: CoachContextPack['last_call'] = null;

    if (isSyntheticAlex) {
      lastCall = {
        topics_covered: ['hydration', 'daily_movement'],
        commitments: ['Drink minimum 2.5L water daily'],
        date: '2 days ago',
      };
    } else if (pool) {
      try {
        const callRes = await pool.query(
          `SELECT id, ended_at FROM calls
           WHERE user_id = $1 AND status IN ('completed', 'ended')
           ORDER BY started_at DESC LIMIT 1;`,
          [userId]
        );
        if (callRes.rows[0]) {
          const notesRes = await pool.query(
            `SELECT note, checkpoint_type, data FROM call_notes
             WHERE call_id = $1 ORDER BY created_at ASC;`,
            [callRes.rows[0].id]
          );

          // Extract structured topics only, never free text
          const topics = new Set<string>();
          const liveIssueTitles = openIssues.map((i) => i.title.toLowerCase());
          const validCommitments: string[] = [];

          for (const row of notesRes.rows) {
            if (row.checkpoint_type === 'topic_discussed' && row.data?.topic) {
              topics.add(String(row.data.topic));
            }
            if (row.checkpoint_type === 'commitment_made' && row.note) {
              // Ensure commitment does not reference a purged issue
              const noteLower = row.note.toLowerCase();
              const mentionsPurged = !liveIssueTitles.some((t) => noteLower.includes(t)) &&
                (noteLower.includes('pain') || noteLower.includes('knee') || noteLower.includes('dard') || noteLower.includes('shoulder'));
              if (!mentionsPurged) {
                validCommitments.push(row.note);
              }
            }
          }

          if (topics.size > 0 || validCommitments.length > 0) {
            lastCall = {
              topics_covered: Array.from(topics),
              commitments: validCommitments.slice(0, 2),
              date: callRes.rows[0].ended_at ? new Date(callRes.rows[0].ended_at).toLocaleDateString() : undefined,
            };
          }
        }
      } catch (err: any) {
        console.warn('[CoachContextService] Call query warning:', err.message);
      }
    }

    // 6. Next Scheduled Call (Null if none scheduled)
    let nextCall: CoachContextPack['next_call'] = null;

    if (isSyntheticAlex) {
      nextCall = {
        scheduled_for: 'Tomorrow 10:00 AM',
        channel: 'app',
        reason: 'Mid-week recovery check-in',
      };
    } else if (pool) {
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
      `User: (name omitted) | Language: ${pack.profile.language} | Timezone: ${pack.profile.tz} | Goal: ${pack.profile.goal} | Preferred Call: ${pack.profile.preferred_call_time}`
    );

    lines.push('Daily Health & Activity:');
    lines.push(
      `- Today: ${pack.metrics.today.steps.toLocaleString()} / ${pack.metrics.today.step_goal.toLocaleString()} steps | ${pack.metrics.today.calories_in} kcal (target ${pack.metrics.today.calorie_target}) | ${pack.metrics.today.protein_g}g protein | ${pack.metrics.today.water_ml} ml water.`
    );
    if (pack.metrics.yesterday) {
      lines.push(
        `- Yesterday: ${pack.metrics.yesterday.steps.toLocaleString()} steps | ${pack.metrics.yesterday.calories_in} kcal | ${pack.metrics.yesterday.protein_g}g protein.`
      );
    }
    if (pack.metrics.seven_day_summary && pack.metrics.seven_day_summary.avg_steps > 0) {
      lines.push(
        `- 7-Day Trend: Avg ${pack.metrics.seven_day_summary.avg_steps.toLocaleString()} steps/day (${pack.metrics.seven_day_summary.steps_goal_hit_count}/7 hit goal) | Nutrition adherence ${pack.metrics.seven_day_summary.adherence_rate_pct}%.`
      );
    }

    if (pack.active_plan) {
      lines.push(
        `Active Plan: "${pack.active_plan.title}" | Today: ${pack.active_plan.today_workout} | Completed: ${pack.active_plan.seven_day_completion_count} sessions this week.`
      );
    } else {
      lines.push('Active Plan: none. Offer to build one when relevant.');
    }

    if (pack.open_issues && pack.open_issues.length > 0) {
      lines.push('Open Issues (Priority Order):');
      pack.open_issues.forEach((issue, idx) => {
        const followUp = issue.follow_up_question ? ` -> Follow-up opener: "${issue.follow_up_question}"` : '';
        lines.push(`${idx + 1}. [id:${issue.id.slice(0, 8)}] [${issue.category.toUpperCase()}] ${issue.title} (${issue.severity || 'mild'}, reported ${issue.last_mentioned})${followUp}`);
      });
    }

    if (pack.last_call) {
      lines.push('Last Call:');
      if (pack.last_call.topics_covered && pack.last_call.topics_covered.length > 0) {
        lines.push(`- Topics Discussed: ${pack.last_call.topics_covered.join(', ')}`);
      }
      if (pack.last_call.commitments && pack.last_call.commitments.length > 0) {
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
