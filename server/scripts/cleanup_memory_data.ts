import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { SupabaseDb } from '../src/db/supabaseClient';

async function main() {
  const isApply = process.argv.includes('--apply');
  console.log('================================================================');
  console.log(' HEALTHFREAK MEMORY CLEANUP & ORPHAN AUDIT (PART 3 / F7)');
  console.log(` MODE: ${isApply ? '*** APPLY (LIVE DATABASE MODIFICATION) ***' : 'DRY RUN (READ-ONLY)'}`);
  console.log('================================================================\n');

  const pool = SupabaseDb.getPool();
  if (!pool) {
    console.error('Postgres pool unavailable. Check SUPABASE_DATABASE_URL.');
    process.exit(1);
  }

  // 1. Audit Synthetic Rows (usr_synthetic_*)
  console.log('--- 1. SYNTHETIC ROWS (usr_synthetic_*) ---');
  const syntheticTables = [
    { table: 'meal_items', col: 'user_id' },
    { table: 'meals', col: 'user_id' },
    { table: 'calls', col: 'user_id' },
    { table: 'daily_health_snapshots', col: 'user_id' },
    { table: 'health_conditions', col: 'user_id' },
    { table: 'profile_facts', col: 'user_id' },
    { table: 'user_consents', col: 'user_id' },
    { table: 'user_issues', col: 'user_id' },
    { table: 'user_preferences', col: 'user_id' },
    { table: 'profiles', col: 'id' },
  ];

  let totalSynthetic = 0;
  for (const t of syntheticTables) {
    try {
      const res = await pool.query(
        `SELECT COUNT(*)::int as count FROM "${t.table}" WHERE "${t.col}"::text LIKE 'usr_synthetic_%'`
      );
      const c = res.rows[0].count;
      console.log(`  - ${t.table} (${t.col}): ${c}`);
      totalSynthetic += c;
    } catch (err: any) {
      console.log(`  - ${t.table}: error (${err.message})`);
    }
  }
  console.log(`Total Synthetic Rows: ${totalSynthetic}\n`);

  // 2. Audit Resolved Issues (user_issues WHERE status = 'resolved')
  console.log('--- 2. RESOLVED ISSUES IN USER_ISSUES ---');
  const resolvedIssuesRes = await pool.query(
    `SELECT id, user_id, title, category, status, resolved_at FROM user_issues WHERE status = 'resolved'`
  );
  console.log(`Total Resolved Issues in DB: ${resolvedIssuesRes.rows.length}`);
  for (const r of resolvedIssuesRes.rows) {
    console.log(`  - [${r.id}] user: ${r.user_id.slice(0, 10)}... | title: "${r.title}" | resolved_at: ${r.resolved_at}`);
  }
  console.log();

  // 3. Audit Orphaned Follow-Ups & Scheduled Followups
  console.log('--- 3. ORPHANED FOLLOW-UPS ---');
  let orphanedFollowupsCount = 0;
  try {
    const orphanFollowupsRes = await pool.query(
      `SELECT COUNT(*)::int as count FROM follow_ups f
       WHERE NOT EXISTS (SELECT 1 FROM user_issues i WHERE i.id = f.issue_id AND i.status IN ('open', 'improving'))`
    );
    orphanedFollowupsCount = orphanFollowupsRes.rows[0].count;
    console.log(`  - follow_ups without open issue: ${orphanedFollowupsCount}`);
  } catch (err: any) {
    console.log(`  - follow_ups table query: ${err.message}`);
  }

  let orphanedScheduledCount = 0;
  try {
    const orphanSchedRes = await pool.query(
      `SELECT COUNT(*)::int as count FROM scheduled_followups s
       WHERE s.status IN ('completed', 'cancelled')
          OR NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = s.user_id)`
    );
    orphanedScheduledCount = orphanSchedRes.rows[0].count;
    console.log(`  - scheduled_followups completed/orphan: ${orphanedScheduledCount}`);
  } catch (err: any) {
    console.log(`  - scheduled_followups query: ${err.message}`);
  }

  console.log('\n--- AUDIT SUMMARY ---');
  console.log(`- Synthetic rows: ${totalSynthetic}`);
  console.log(`- Resolved issues: ${resolvedIssuesRes.rows.length}`);
  console.log(`- Orphaned follow-ups: ${orphanedFollowupsCount + orphanedScheduledCount}`);

  if (!isApply) {
    console.log('\n[DRY RUN COMPLETE] Default dry-run executed. NO DB MUTATIONS WERE PERFORMED.');
    console.log('[DRY RUN COMPLETE] Awaiting explicit user "apply" before modifying any database records.');
    await pool.end();
    return;
  }

  console.log('\nApplying changes requires user instruction "apply".');
  await pool.end();
}

main().catch(console.error);

