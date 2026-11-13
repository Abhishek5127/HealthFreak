export interface FollowUpTemplate {
  category: string;
  en: string[];
  hi: string[];
  hinglish: string[];
}

const QUESTION_BANKS: Record<string, { en: string[]; hi: string[]; hinglish: string[] }> = {
  pain: {
    en: [
      'How is your {title} feeling today?',
      'Any stiffness or discomfort in your {title} recently?',
      'Are you able to move your {title} comfortably now?',
    ],
    hi: [
      'आज आपके {title} में कैसा महसूस हो रहा है?',
      '{title} में अब कोई दर्द या खिंचाव तो नहीं है?',
      'क्या {title} की वजह से उठने-बैठने में कोई परेशानी हो रही है?',
    ],
    hinglish: [
      'Aapka {title} ab kaisa feel ho raha hai?',
      '{title} me abhi koi pain ya stiffness toh nahi hai?',
      'Exercise karte waqt {title} me koi dikkat toh nahi?',
    ],
  },
  digestion: {
    en: [
      'How has your digestion been feeling today?',
      'Any bloating or acidity issues today?',
    ],
    hi: [
      'आज आपका पाचन और पेट कैसा लग रहा है?',
      'क्या आज एसिडिटी या भारीपन महसूस हुआ?',
    ],
    hinglish: [
      'Aaj digestion aur pet kaisa mehsoos ho raha hai?',
      'Koi acidity ya bloating toh feel nahi ho rahi?',
    ],
  },
  energy: {
    en: [
      'How are your physical energy levels feeling today?',
      'Feeling refreshed today, or still feeling a bit tired?',
    ],
    hi: [
      'आज शरीर में ऊर्जा का स्तर कैसा लग रहा है?',
      'क्या आज ताज़गी महसूस हो रही है या थकान है?',
    ],
    hinglish: [
      'Aaj body me energy levels kaise lag rahe hain?',
      'Thakaan toh feel nahi ho rahi aaj?',
    ],
  },
  general: {
    en: [
      'How is your {title} feeling today?',
      'Any update on your {title}?',
    ],
    hi: [
      'आज आपके {title} की स्थिति कैसी है?',
      '{title} को लेकर आज कैसा महसूस हो रहा है?',
    ],
    hinglish: [
      'Aapka {title} aaj kaisa hai?',
      '{title} ko lekar aaj kaisa mehsoos ho raha hai?',
    ],
  },
};

export class FollowUpGenerator {
  /**
   * Generates a context-dependent follow-up question dynamically from an open issue.
   * NEVER reads or writes stored question strings to database.
   */
  public static generateQuestion(
    issue: { title: string; category?: string },
    lang: 'en' | 'hi' | 'hinglish' = 'hinglish',
    seed = 0
  ): string {
    const cat = (issue.category || 'general').toLowerCase();
    const bank = QUESTION_BANKS[cat] || QUESTION_BANKS.general;
    const questions = bank[lang] || bank.hinglish || bank.en;
    const index = Math.abs(seed) % questions.length;
    const template = questions[index];
    return template.replace(/\{title\}/g, issue.title);
  }
}

