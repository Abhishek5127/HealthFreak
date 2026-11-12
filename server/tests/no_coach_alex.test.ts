import fs from 'fs';
import path from 'path';

function searchDirectory(dir: string, matches: string[]) {
  const ignoreDirs = new Set(['node_modules', '.git', '.venv', 'dist', 'build', '.expo']);
  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (ignoreDirs.has(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      searchDirectory(fullPath, matches);
    } else if (stat.isFile()) {
      const ext = path.extname(file).toLowerCase();
      const codeExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.json', '.md', '.html', '.sql', '.yaml', '.yml'];
      if (!codeExts.includes(ext)) continue;

      // Skip this test file itself
      if (file === 'no_coach_alex.test.ts') continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      if (/coach\s+alex/i.test(content)) {
        matches.push(fullPath);
      }
    }
  }
}

function runTest() {
  console.log('=== TEST: ASSERT "Coach Alex" DOES NOT APPEAR IN REPO ===\n');
  const rootDir = path.resolve(__dirname, '../../');
  const matches: string[] = [];

  searchDirectory(rootDir, matches);

  if (matches.length > 0) {
    console.error('FAIL: Found "Coach Alex" in the following files:');
    matches.forEach((m) => console.error(`  - ${m}`));
    process.exit(1);
  }

  console.log('PASS: 0 occurrences of "Coach Alex" found across the codebase.');
  console.log('Verified: Persona is Coach Mack everywhere.\n');
  process.exit(0);
}

runTest();
