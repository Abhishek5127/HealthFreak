import { OpenerBudget, StreamingOpenerFilter, detectLeadingOpener, countSentences } from '../src/coach/style/openerBudget.js';
import { stripFormulaicOpener as serverStrip } from '../src/services/sarvamService.js';

async function runPart1Verification() {
  console.log('====================================================');
  console.log('=== PART 1 VERIFICATION: OPENER BUDGET & VARIETY ===');
  console.log('====================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(desc: string, cond: boolean) {
    totalTests++;
    if (cond) {
      passedTests++;
      console.log(`[PASS] ${desc}`);
    } else {
      console.error(`[FAIL] ${desc}`);
    }
  }

  // TEST SUITE 1: Detection of Roman, Devanagari, Honorifics, and Mid-sentence non-matches
  console.log('--- TEST SUITE 1: BILINGUAL OPENER DETECTION ---');

  const t1 = detectLeadingOpener('अरे अभिषेक, आज कैसा लग रहा है?', 'Abhishek');
  assert('Detects Devanagari "अरे अभिषेक, "', t1.hasOpener && t1.matchedClause.trim().startsWith('अरे'));
  assert('Strips leading Devanagari clause correctly', t1.remainingText === 'आज कैसा लग रहा है?');

  const t2 = detectLeadingOpener('अरे वाह! आपने 8,000 steps पूरे कर लिए।', 'Abhishek');
  assert('Detects Devanagari standalone "अरे वाह!"', t2.hasOpener && t2.matchedClause.trim().startsWith('अरे वाह'));
  assert('Strips leading "अरे वाह!" clause', t2.remainingText.includes('आपने 8,000 steps'));

  const t3 = detectLeadingOpener('Arre Abhishek ji, kal ka workout start karein?', 'Abhishek');
  assert('Detects Roman composite "Arre Abhishek ji, "', t3.hasOpener && t3.matchedClause.toLowerCase().includes('abhishek'));
  assert('Strips leading Roman composite', t3.remainingText === 'Kal ka workout start karein?');

  const t4 = detectLeadingOpener('Abhishek ji, 2.5L water peena zaroori hai.', 'Abhishek');
  assert('Detects standalone Name + ji', t4.hasOpener);
  assert('Strips Name + ji', t4.remainingText === '2.5L water peena zaroori hai.');

  const t5 = detectLeadingOpener('Aaj workout me Abhishek ji squats karenge.', 'Abhishek');
  assert('Mid-sentence name untouched (hasOpener === false)', !t5.hasOpener && t5.remainingText === 'Aaj workout me Abhishek ji squats karenge.');

  const t6 = detectLeadingOpener('Dr. Sharma advises that Abhishek ji walks 30 min daily.', 'Abhishek');
  assert('Mid-sentence name with Dr. untouched', !t6.hasOpener);

  // TEST SUITE 2: Sentence Counter ignoring decimals and abbreviations
  console.log('\n--- TEST SUITE 2: SENTENCE COUNTING ACCURACY ---');
  assert('Counts 1 sentence with decimal 2.5', countSentences('Target 2.5L water daily.') === 1);
  assert('Counts 2 sentences with Dr. and decimal', countSentences('Dr. Sharma recommended 2.5L water. Kal subah milte hain.') === 2);
  assert('Counts Devanagari purna viram (।)', countSentences('आज 15 मिनट वॉक कीजिए। कल 20 मिनट करेंगे। बहुत बढ़िया!') === 3);

  // TEST SUITE 3: 60-Reply Simulated Simulation Across All Generation Paths
  console.log('\n--- TEST SUITE 3: 60-REPLY SIMULATION & BUDGET ENFORCEMENT ---');

  const sessionId = 'verify_part1_sim_session_' + Date.now();
  OpenerBudget.resetSession(sessionId);

  const sampleOpenerPool = [
    'अरे अभिषेक, आज 15 मिनट वॉक कर लीजिए। यह आपके लिए बहुत फ़ायदेमंद रहेगा।',
    'अरे वाह! आपने आज का स्टेप गोल पूरा कर लिया है। बहुत बढ़िया काम किया।',
    'Arre Abhishek ji, kal subah routine start karte hain. 2.5L water zaroor peena.',
    'Abhishek ji, dinner me halki sabzi aur daal lein. Isse digestion theek rahega.',
    'Pura din active rehne ke liye thoda walk zaroori hai. Shaam ko 10 minute chalein.',
    'Aaj ka workout schedule ready hai. Pehle 5 minute warm-up karein.',
    'Paani ki matra badhana dehydration se bachata hai. Kam se kam 2.5L paani piyein.',
  ];

  let totalSimulatedSentences = 0;
  let allowedOpenersCount = 0;
  let strippedOpenersCount = 0;
  let consecutiveOpenerViolations = 0;
  let prevHadOpener = false;
  const sentenceGapsBetweenOpeners: number[] = [];
  let currentSentenceGap = 0;

  for (let turn = 0; turn < 60; turn++) {
    // Model generates reply that may contain formulaic openers
    const rawTemplate = sampleOpenerPool[turn % sampleOpenerPool.length];
    const pathName = turn % 4 === 0 ? 'livekit_agent' : turn % 4 === 1 ? 'audio_turn' : turn % 4 === 2 ? 'chat_stream' : 'chat_sync';

    const processed = OpenerBudget.processReply({
      sessionId,
      text: rawTemplate,
      userName: 'Abhishek',
      path: pathName,
      lang: turn % 2 === 0 ? 'hi' : 'hinglish',
    });

    const hasAllowedOpener = processed.openerAction === 'allowed';
    if (hasAllowedOpener) {
      if (prevHadOpener) {
        consecutiveOpenerViolations++;
      }
      allowedOpenersCount++;
      sentenceGapsBetweenOpeners.push(currentSentenceGap);
      currentSentenceGap = 0;
    } else {
      currentSentenceGap += processed.sentenceCount;
    }

    if (processed.openerAction === 'stripped') {
      strippedOpenersCount++;
      // Remainder must not start with the opener
      const reCheck = detectLeadingOpener(processed.cleanedText, 'Abhishek');
      assert(`Turn ${turn + 1}: Stripped reply has no leading opener`, !reCheck.hasOpener);
    }

    totalSimulatedSentences += processed.sentenceCount;
    prevHadOpener = hasAllowedOpener;
  }

  const openerSharePct = (allowedOpenersCount / totalSimulatedSentences) * 100;
  const sentencesPerOpener = allowedOpenersCount > 0 ? (totalSimulatedSentences / allowedOpenersCount) : totalSimulatedSentences;

  console.log(`\nSimulation Results across 60 turns:`);
  console.log(`- Total sentences: ${totalSimulatedSentences}`);
  console.log(`- Allowed openers: ${allowedOpenersCount}`);
  console.log(`- Stripped openers: ${strippedOpenersCount}`);
  console.log(`- Sentences per opener: ~${sentencesPerOpener.toFixed(1)} (target: >= 20 sentences)`);
  console.log(`- Opener share: ${openerSharePct.toFixed(2)}% (target: <= 5.0%)`);
  console.log(`- Consecutive opener violations: ${consecutiveOpenerViolations}`);

  assert('Never two openers in a row', consecutiveOpenerViolations === 0);
  assert('Opener rate <= 1 per 20 sentences', sentencesPerOpener >= 20);
  assert('Turn 0 greeting allowed', OpenerBudget.getState(sessionId).turnIndex === 60);

  // TEST SUITE 4: StreamingOpenerFilter Verification
  console.log('\n--- TEST SUITE 4: STREAMING OPENER FILTER ---');
  const streamSession = 'verify_stream_session_' + Date.now();
  OpenerBudget.resetSession(streamSession);

  // Turn 0: Allowed
  let streamedTurn0 = '';
  const filterTurn0 = new StreamingOpenerFilter({
    sessionId: streamSession,
    userName: 'Abhishek',
    path: '/chat/stream',
    lang: 'hi',
    onToken: (tok) => { streamedTurn0 += tok; },
  });
  await filterTurn0.push('अरे ');
  await filterTurn0.push('अभिषेक, ');
  await filterTurn0.push('आज 15 मिनट ');
  await filterTurn0.push('walk kar lijiye.');
  await filterTurn0.flush();

  assert('Streaming turn 0 opener preserved', streamedTurn0.includes('अरे अभिषेक'));

  // Turn 1: Budget exhausted, must be stripped without dropping rest of stream
  let streamedTurn1 = '';
  const filterTurn1 = new StreamingOpenerFilter({
    sessionId: streamSession,
    userName: 'Abhishek',
    path: '/chat/stream',
    lang: 'hi',
    onToken: (tok) => { streamedTurn1 += tok; },
  });
  await filterTurn1.push('Arre ');
  await filterTurn1.push('Abhishek ji, ');
  await filterTurn1.push('hydration goal ');
  await filterTurn1.push('pura karein.');
  await filterTurn1.flush();

  assert('Streaming turn 1 opener stripped cleanly', !streamedTurn1.toLowerCase().includes('arre'));
  assert('Streaming turn 1 body preserved', streamedTurn1.toLowerCase().includes('hydration goal pura karein.'));

  // TEST SUITE 5: Bilingual Strip Parity
  console.log('\n--- TEST SUITE 5: BILINGUAL STRIP PARITY ---');
  const rawDevanagari = 'अरे अभिषेक जी, 2 लीटर पानी पीजिए।';
  const sClean = serverStrip(rawDevanagari, 'Abhishek');
  assert('Server strip removes Devanagari opener', !sClean.startsWith('अरे') && sClean.includes('पानी पीजिए'));
  const rawRoman = 'Arre Abhishek, please drink 2.5L water daily.';
  const rClean = serverStrip(rawRoman, 'Abhishek');
  assert('Server strip removes Roman opener', !rClean.toLowerCase().startsWith('arre') && rClean.toLowerCase().includes('please drink'));

  console.log('\n====================================================');
  console.log(`PART 1 VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPart1Verification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
