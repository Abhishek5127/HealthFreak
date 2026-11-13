import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { SupabaseDb } from '../src/db/supabaseClient';

interface TargetTable {
  table: string;
  col: string;
  expectedCount: number;
}

const TARGET_TABLES: TargetTable[] = [
  { table: 'meal_items', col: 'user_id', expectedCount: 153 },
  { table: 'meals', col: 'user_id', expectedCount: 153 },
  { table: 'calls', col: 'user_id', expectedCount: 16 },
  { table: 'daily_health_snapshots', col: 'user_id', expectedCount: 5 },
  { table: 'health_conditions', col: 'user_id', expectedCount: 1 },
  { table: 'profile_facts', col: 'user_id', expectedCount: 1 },
  { table: 'user_consents', col: 'user_id', expectedCount: 1 },
  { table: 'user_issues', col: 'user_id', expectedCount: 1 },
  { table: 'user_preferences', col: 'user_id', expectedCount: 1 },
  { table: 'profiles', col: 'id', expectedCount: 1 },
];

const EXPECTED_TOTAL_ROWS = 333;

async function purgeSyntheticData() {
  const isApply = process.argv.includes('--apply');
  console.log('=====================================================');
  console.log(' HealthFreak Synthetic Data Purge Script');
  console.log(` Mode: ${isApply ? '*** APPLY (LIVE DATABASE MODIFICATION) ***' : 'DRY RUN (READ-ONLY)'}`);
  console.log('=====================================================\n');

  const pool = SupabaseDb.getPool();
  if (!pool) {
    console.error('[Purge] Error: Postgres pool unavailable. Check SUPABASE_DATABASE_URL.');
    process.exit(1);
  }

  // Step 1: Pre-deletion verification and export
  console.log('[Purge] Step 1: Querying synthetic rows across all 10 tables...');
  const backupData: Record<string, any[]> = {};
  let totalRowsFound = 0;

  for (const t of TARGET_TABLES) {
    const res = await pool.query(
      `SELECT * FROM "${t.table}" WHERE "${t.col}"::text LIKE 'usr_synthetic_%'`
    );
    backupData[t.table] = res.rows;
    totalRowsFound += res.rows.length;
    console.log(`  - ${t.table} (${t.col}): ${res.rows.length} rows (expected: ${t.expectedCount})`);
  }

  console.log(`\n[Purge] Total synthetic rows identified: ${totalRowsFound} (Expected: ${EXPECTED_TOTAL_ROWS})`);

  if (totalRowsFound !== EXPECTED_TOTAL_ROWS) {
    console.warn(`[Purge] WARNING: Total synthetic rows (${totalRowsFound}) does not match expected (${EXPECTED_TOTAL_ROWS}).`);
  }

  // Step 2: Export pre-deletion JSON backup
  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `synthetic_backup_${timestamp}.json`);
  fs.writeFileSync(
    backupFilePath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        totalRows: totalRowsFound,
        tables: backupData,
      },
      null,
      2
    ),
    'utf-8'
  );
  console.log(`[Purge] Pre-deletion backup exported successfully to:\n  ${backupFilePath}\n`);

  if (!isApply) {
    console.log('[Purge] Dry-run completed. NO DATA WAS MODIFIED OR DELETED.');
    console.log('[Purge] To execute atomic deletion, pass the --apply flag after user confirmation.');
    await pool.end();
    return;
  }

  // Step 3: Atomic deletion in a single transaction
  console.log('[Purge] Step 3: Executing atomic deletion in a single transaction...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let totalDeleted = 0;

    for (const t of TARGET_TABLES) {
      const delRes = await client.query(
        `DELETE FROM "${t.table}" WHERE "${t.col}"::text LIKE 'usr_synthetic_%'`
      );
      const deletedCount = delRes.rowCount || 0;
      totalDeleted += deletedCount;
      console.log(`  - Deleted ${deletedCount} rows from ${t.table}`);
    }

    if (totalDeleted !== totalRowsFound) {
      throw new Error(`Deletion count mismatch! Expected ${totalRowsFound}, deleted ${totalDeleted}. Rolling back.`);
    }

    await client.query('COMMIT');
    console.log(`\n[Purge] TRANSACTION COMMITTED: Successfully deleted ${totalDeleted} synthetic rows.`);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('\n[Purge] TRANSACTION ROLLED BACK DUE TO ERROR:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  purgeSyntheticData().catch((err) => {
    console.error('[Purge] Fatal error:', err);
    process.exit(1);
  });
}
