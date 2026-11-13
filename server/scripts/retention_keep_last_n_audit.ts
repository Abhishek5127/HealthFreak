import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { SupabaseDb } from '../src/db/supabaseClient.js';
import { TranscriptRetentionJob } from '../src/coach/memory/retentionJob.js';

async function main() {
  const isApply = process.argv.includes('--apply');
  const keepLastN = TranscriptRetentionJob.getKeepLastN();

  console.log('================================================================');
  console.log(' HEALTHFREAK: TRANSCRIPT RETENTION (KEEP-LAST-N) AUDIT (R9)');
  console.log(` RETENTION RULE: Keep latest ${keepLastN} calls with >= 1 user turn`);
  console.log(` MODE: ${isApply ? '*** APPLY (LIVE DATABASE MODIFICATION) ***' : 'DRY RUN (READ-ONLY)'}`);
  console.log('================================================================\n');

  const pool = SupabaseDb.getPool();
  if (!pool) {
    console.log('[Notice] Postgres pool not configured. Running in-memory audit.');
    console.log(`KeepLastN: ${keepLastN}`);
    console.log('Total live database records affected: 0 (No active PostgreSQL pool).');
    return;
  }

  const client = await pool.connect();
  try {
    // 1. Audit overall table counts before retention
    console.log('--- 1. CURRENT DATABASE COUNTS ---');
    const tableCounts = [
      'calls',
      'call_transcript_turns',
      'call_extraction_jobs',
      'call_notes',
      'user_issues',
      'issue_history',
    ];

    for (const t of tableCounts) {
      try {
        const cRes = await client.query(`SELECT COUNT(*)::int as count FROM "${t}"`);
        console.log(`  - ${t}: ${cRes.rows[0].count} rows`);
      } catch (err: any) {
        console.log(`  - ${t}: (table not present / notice: ${err.message})`);
      }
    }
    console.log();

    // 2. Per-user audit
    console.log('--- 2. PER-USER RETENTION AUDIT ---');
    const usersRes = await client.query(
      `SELECT DISTINCT user_id FROM calls WHERE user_id IS NOT NULL`
    );

    const userAudits: any[] = [];
    const backupData: any = {
      timestamp: new Date().toISOString(),
      keepLastN,
      users: {},
    };

    let totalCandidateTurns = 0;
    let totalCandidateSummaries = 0;
    let totalCandidateNotes = 0;
    let totalPreservedCommitments = 0;

    // Check if migration 005 tables exist
    const checkTablesRes = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('call_transcript_turns', 'call_extraction_jobs');`
    );
    const existingTables = new Set(checkTablesRes.rows.map((r: any) => r.table_name));
    const hasTurnsTable = existingTables.has('call_transcript_turns');
    const hasJobsTable = existingTables.has('call_extraction_jobs');

    const turnCountExpr = hasTurnsTable
      ? `COALESCE((SELECT COUNT(*)::int FROM call_transcript_turns t WHERE t.call_id = c.id AND t.role = 'user'), 0)`
      : `0`;
    const jobStatusExpr = hasJobsTable
      ? `(SELECT status FROM call_extraction_jobs j WHERE j.call_id = c.id LIMIT 1)`
      : `NULL`;
    const jobCreatedExpr = hasJobsTable
      ? `(SELECT created_at FROM call_extraction_jobs j WHERE j.call_id = c.id LIMIT 1)`
      : `NULL`;

    for (const uRow of usersRes.rows) {
      const userId = uRow.user_id;
      const maskedUserId = userId.length > 12 ? `${userId.slice(0, 8)}...${userId.slice(-4)}` : userId;

      const callsRes = await client.query(
        `SELECT c.id, c.started_at, c.transcript, c.summary_status,
                ${turnCountExpr} as turn_user_count,
                ${jobStatusExpr} as extraction_status,
                ${jobCreatedExpr} as extraction_created_at
         FROM calls c
         WHERE c.user_id = $1
         ORDER BY c.started_at DESC;`,
        [userId]
      );

      const callsWithUserTurns = callsRes.rows.filter((r) => {
        if (r.turn_user_count > 0) return true;
        if (Array.isArray(r.transcript)) {
          return r.transcript.some((t: any) => t.role === 'user');
        }
        return false;
      });

      const protectedCalls = callsWithUserTurns.slice(0, keepLastN);
      const candidateCalls = callsWithUserTurns.slice(keepLastN);

      const audit = {
        userId: maskedUserId,
        rawUserId: userId,
        totalCalls: callsWithUserTurns.length,
        protectedCount: protectedCalls.length,
        candidateCount: candidateCalls.length,
        eligiblePrunedCalls: [] as string[],
        skippedCalls: [] as any[],
        turnsToPrune: 0,
        summariesToNull: 0,
        notesToPrune: 0,
        commitmentsPreserved: 0,
      };

      const userBackupEntries: any[] = [];

      for (const call of candidateCalls) {
        const extStatus = call.extraction_status || 'completed';
        const extCreatedAt = call.extraction_created_at ? new Date(call.extraction_created_at).getTime() : new Date(call.started_at).getTime();
        const ageInDays = (Date.now() - extCreatedAt) / (1000 * 60 * 60 * 24);

        if (extStatus === 'pending' || extStatus === 'processing') {
          audit.skippedCalls.push({ callId: call.id, reason: `extraction_${extStatus}` });
          continue;
        }

        if (extStatus === 'failed' && ageInDays < 7) {
          audit.skippedCalls.push({ callId: call.id, reason: `failed_retry_pending_${Math.round(ageInDays)}d` });
          continue;
        }

        // Eligible
        audit.eligiblePrunedCalls.push(call.id);

        const turnsRes = hasTurnsTable
          ? await client.query(
              `SELECT turn_index, role, text, created_at FROM call_transcript_turns WHERE call_id = $1 ORDER BY turn_index ASC`,
              [call.id]
            )
          : { rows: [] };
        const freeNotesRes = await client.query(
          `SELECT id, checkpoint_type, note, data, created_at FROM call_notes WHERE call_id = $1 AND checkpoint_type != 'commitment_made'`,
          [call.id]
        );
        const commitmentsRes = await client.query(
          `SELECT id, note, created_at FROM call_notes WHERE call_id = $1 AND checkpoint_type = 'commitment_made'`,
          [call.id]
        );

        audit.turnsToPrune += turnsRes.rows.length;
        audit.summariesToNull += 1;
        audit.notesToPrune += freeNotesRes.rows.length;
        audit.commitmentsPreserved += commitmentsRes.rows.length;

        userBackupEntries.push({
          callId: call.id,
          startedAt: call.started_at,
          transcriptTurns: turnsRes.rows,
          freeNotes: freeNotesRes.rows,
          commitmentsPreserved: commitmentsRes.rows,
        });
      }

      totalCandidateTurns += audit.turnsToPrune;
      totalCandidateSummaries += audit.summariesToNull;
      totalCandidateNotes += audit.notesToPrune;
      totalPreservedCommitments += audit.commitmentsPreserved;

      backupData.users[userId] = userBackupEntries;
      userAudits.push(audit);

      console.log(`User: ${maskedUserId}`);
      console.log(`  - Calls with >= 1 user turn: ${audit.totalCalls}`);
      console.log(`  - Protected (latest ${keepLastN}): ${audit.protectedCount} calls`);
      console.log(`  - Eligible for pruning: ${audit.eligiblePrunedCalls.length} calls`);
      console.log(`  - Skipped (pending/processing extraction): ${audit.skippedCalls.length} calls`);
      console.log(`  - Transcript turns that WOULD be pruned: ${audit.turnsToPrune}`);
      console.log(`  - Calls.transcript/summary that WOULD be nulled: ${audit.summariesToNull}`);
      console.log(`  - Free-text call_notes that WOULD be deleted: ${audit.notesToPrune}`);
      console.log(`  - Commitments that WOULD be PRESERVED: ${audit.commitmentsPreserved}`);
      console.log();
    }

    // 3. Export backup to gitignored server/backups/
    const backupsDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    const backupFileName = `retention_dryrun_backup_${Date.now()}.json`;
    const backupFilePath = path.join(backupsDir, backupFileName);
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

    console.log('--- AUDIT TOTALS ---');
    console.log(`- Users audited: ${userAudits.length}`);
    console.log(`- Total calls eligible for pruning: ${userAudits.reduce((acc, u) => acc + u.eligiblePrunedCalls.length, 0)}`);
    console.log(`- Total transcript turns to prune: ${totalCandidateTurns}`);
    console.log(`- Total call summaries/transcripts to null: ${totalCandidateSummaries}`);
    console.log(`- Total free-text call_notes to delete: ${totalCandidateNotes}`);
    console.log(`- Total commitments permanently PRESERVED: ${totalPreservedCommitments}`);
    console.log(`- Backup export created: ${backupFilePath} (gitignored)`);
    console.log();

    if (!isApply) {
      console.log('================================================================');
      console.log(' [DRY RUN COMPLETE] NO DATABASE WRITES OR DELETES WERE EXECUTED.');
      console.log(' Awaiting explicit user reply "apply" before performing any mutations.');
      console.log('================================================================');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
