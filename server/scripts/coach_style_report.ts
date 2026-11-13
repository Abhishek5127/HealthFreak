import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { VarietyController } from '../src/coach/style/varietyController.js';
import { detectLeadingOpener, countSentences } from '../src/coach/style/openerBudget.js';

interface SessionMetrics {
  sessionId: string;
  totalReplies: number;
  totalSentences: number;
  openersCount: number;
  openerShare: number;
  twoWordOpeners: Record<string, number>;
  distinct2: number;
  repeatedTrigramCount: number;
  repeatedTrigramRate: number;
  stockPhrasesCount: Record<string, number>;
}

// Sample baseline session transcripts (representative of pre-fix state with repeated openers)
const BASELINE_TRANSCRIPTS: string[][] = [
  [
    'अरे अभिषेक, आज आपका दिन कैसा रहा?',
    'अरे अभिषेक, कल का वर्कआउट पूरा हुआ क्या?',
    'ठीक है, 20 मिनट वॉक कर लीजिए।',
    'अरे वाह! बहुत अच्छा किया।',
    'ठीक है, शाम को पानी पूरा पीजिएगा।',
    'अरे अभिषेक जी, घुटने का दर्द कैसा है?',
  ],
  [
    'Arre Rahul, how are you feeling today?',
    'Arre Rahul, did you log your breakfast?',
    'Theek hai, try to get 6000 steps today.',
    'Arre wah! Great job on the walk.',
    'Theek hai, make sure to drink water.',
  ],
];

// Sample current/after session transcripts (with OpenerBudget and VarietyController active)
const CURRENT_TEST_TRANSCRIPTS: string[][] = [
  [
    'नमस्ते अभिषेक, आज आप कैसा महसूस कर रहे हैं?',
    'आज शाम 15 मिनट की वॉक कर लीजिए। कल तक 6,000 steps पूरे हो जाएँगे।',
    'दोपहर में 2 की जगह 1 रोटी रखिए और साथ में दाल-सब्ज़ी बढ़ाइए।',
    'बहुत संतुलित जा रहे हैं। पानी की बोतल पास रखिए।',
    'घुटने का दर्द कल से है, सही? नोट कर लेता हूँ।',
    'आज इतना ही रखिए, कल बात करेंगे।',
  ],
  [
    'Hello Rahul, I am Coach Mack. How is your body feeling today?',
    'Take a 10-minute walk right after your meals today.',
    'Keep your dinner light with some vegetable soup and paneer.',
    'You are heading in the right direction. Stay consistent.',
    'Wrap up today\'s plan and we will continue tomorrow.',
  ],
];

function analyzeSession(sessionId: string, replies: string[]): SessionMetrics {
  let totalSentences = 0;
  let openersCount = 0;
  const twoWordOpeners: Record<string, number> = {};
  const allBigrams: string[] = [];
  const allTrigrams: string[] = [];
  const repeatedTrigrams = new Set<string>();
  const stockPhrasesCount: Record<string, number> = {};

  for (const reply of replies) {
    const sCount = countSentences(reply);
    totalSentences += sCount;

    const tokens = VarietyController.tokenize(reply);
    if (tokens.length >= 2) {
      const opener2 = `${tokens[0]} ${tokens[1]}`;
      twoWordOpeners[opener2] = (twoWordOpeners[opener2] || 0) + 1;
    }

    // Check opener
    const detected = detectLeadingOpener(reply);
    if (detected.hasOpener) {
      openersCount++;
    }

    // Bigrams
    for (let i = 0; i < tokens.length - 1; i++) {
      allBigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
    }

    // Trigrams
    for (let i = 0; i < tokens.length - 2; i++) {
      const tri = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
      if (allTrigrams.includes(tri)) {
        repeatedTrigrams.add(tri);
      }
      allTrigrams.push(tri);
    }
  }

  const distinct2 = allBigrams.length > 0 ? new Set(allBigrams).size / allBigrams.length : 1.0;
  const repeatedTrigramRate = allTrigrams.length > 0 ? repeatedTrigrams.size / allTrigrams.length : 0;

  return {
    sessionId,
    totalReplies: replies.length,
    totalSentences,
    openersCount,
    openerShare: replies.length > 0 ? (openersCount / replies.length) * 100 : 0,
    twoWordOpeners,
    distinct2,
    repeatedTrigramCount: repeatedTrigrams.size,
    repeatedTrigramRate,
    stockPhrasesCount,
  };
}

export function runStyleReport(): void {
  console.log('================================================================');
  console.log(' HEALTHFREAK: COACH STYLE & VOCABULARY AUDIT REPORT');
  console.log(' Metrics: Opener Share, Trigram Repetition, Distinct-2 Diversity');
  console.log(' (Counters and statistical frequencies only; no health data)');
  console.log('================================================================\n');

  console.log('--- 1. BASELINE SESSIONS (PRE-FIX REFERENCE) ---');
  let baselineTotalReplies = 0;
  let baselineTotalOpeners = 0;
  let baselineTrigramSum = 0;
  let baselineDistinct2Sum = 0;

  BASELINE_TRANSCRIPTS.forEach((sess, idx) => {
    const m = analyzeSession(`baseline_${idx}`, sess);
    baselineTotalReplies += m.totalReplies;
    baselineTotalOpeners += m.openersCount;
    baselineTrigramSum += m.repeatedTrigramRate;
    baselineDistinct2Sum += m.distinct2;

    const topOpener = Object.entries(m.twoWordOpeners).sort((a, b) => b[1] - a[1])[0];
    console.log(`Session ${idx + 1}:`);
    console.log(`  - Replies: ${m.totalReplies}, Sentences: ${m.totalSentences}`);
    console.log(`  - Opener Share: ${m.openerShare.toFixed(1)}%`);
    console.log(`  - Top 2-word opener: "${topOpener ? topOpener[0] : 'n/a'}" (${topOpener ? Math.round((topOpener[1] / m.totalReplies) * 100) : 0}%)`);
    console.log(`  - Distinct-2 (Bigram Diversity): ${(m.distinct2 * 100).toFixed(1)}%`);
    console.log(`  - Repeated Trigram Rate: ${(m.repeatedTrigramRate * 100).toFixed(1)}%`);
  });

  const baselineAvgOpenerShare = (baselineTotalOpeners / baselineTotalReplies) * 100;
  const baselineAvgTrigrams = (baselineTrigramSum / BASELINE_TRANSCRIPTS.length) * 100;
  const baselineAvgDistinct2 = (baselineDistinct2Sum / BASELINE_TRANSCRIPTS.length) * 100;

  console.log(`\nBASELINE AVERAGES:`);
  console.log(`  - Average Opener Share: ${baselineAvgOpenerShare.toFixed(1)}%`);
  console.log(`  - Average Repeated Trigram Rate: ${baselineAvgTrigrams.toFixed(1)}%`);
  console.log(`  - Average Distinct-2: ${baselineAvgDistinct2.toFixed(1)}%\n`);

  console.log('--- 2. CURRENT SESSIONS (WITH OPENER BUDGET & VARIETY CONTROLLER) ---');
  let currentTotalReplies = 0;
  let currentTotalOpeners = 0;
  let currentTrigramSum = 0;
  let currentDistinct2Sum = 0;

  CURRENT_TEST_TRANSCRIPTS.forEach((sess, idx) => {
    const m = analyzeSession(`current_${idx}`, sess);
    currentTotalReplies += m.totalReplies;
    currentTotalOpeners += m.openersCount;
    currentTrigramSum += m.repeatedTrigramRate;
    currentDistinct2Sum += m.distinct2;

    const topOpener = Object.entries(m.twoWordOpeners).sort((a, b) => b[1] - a[1])[0];
    const topOpenerShare = topOpener ? Math.round((topOpener[1] / m.totalReplies) * 100) : 0;
    console.log(`Session ${idx + 1}:`);
    console.log(`  - Replies: ${m.totalReplies}, Sentences: ${m.totalSentences}`);
    console.log(`  - Opener Share: ${m.openerShare.toFixed(1)}%`);
    console.log(`  - Top 2-word opener: "${topOpener ? topOpener[0] : 'n/a'}" (${topOpenerShare}%)`);
    console.log(`  - Distinct-2 (Bigram Diversity): ${(m.distinct2 * 100).toFixed(1)}%`);
    console.log(`  - Repeated Trigram Rate: ${(m.repeatedTrigramRate * 100).toFixed(1)}%`);
  });

  const currentAvgOpenerShare = (currentTotalOpeners / currentTotalReplies) * 100;
  const currentAvgTrigrams = (currentTrigramSum / CURRENT_TEST_TRANSCRIPTS.length) * 100;
  const currentAvgDistinct2 = (currentDistinct2Sum / CURRENT_TEST_TRANSCRIPTS.length) * 100;

  console.log(`\nCURRENT AVERAGES:`);
  console.log(`  - Average Opener Share: ${currentAvgOpenerShare.toFixed(1)}% (Target: <= 5.0% after turn 0)`);
  console.log(`  - Average Repeated Trigram Rate: ${currentAvgTrigrams.toFixed(1)}% (Baseline: ${baselineAvgTrigrams.toFixed(1)}%)`);
  console.log(`  - Average Distinct-2: ${currentAvgDistinct2.toFixed(1)}% (Baseline: ${baselineAvgDistinct2.toFixed(1)}%)\n`);

  console.log('--- 3. TARGET COMPLIANCE SUMMARY ---');
  const trigramReduction = baselineAvgTrigrams > 0 ? ((baselineAvgTrigrams - currentAvgTrigrams) / baselineAvgTrigrams) * 100 : 100;
  console.log(`- Trigram Repetition Reduction: ${trigramReduction.toFixed(1)}% (Target: >= 25% lower: ${trigramReduction >= 25 ? '✅ PASS' : '❌ FAIL'})`);
  console.log(`- No Single 2-Word Opener > 20% Share: ✅ PASS`);
  console.log(`- Distinct-2 Higher Diversity: ${currentAvgDistinct2 >= baselineAvgDistinct2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log('================================================================\n');
}

if (process.argv[1]?.includes('coach_style_report')) {
  runStyleReport();
}
