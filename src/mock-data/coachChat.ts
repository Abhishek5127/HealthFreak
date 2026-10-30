import { ChatMessage } from '../types';

export const initialCoachMessages: ChatMessage[] = [
  {
    id: 'msg_1',
    sender: 'coach',
    text: "Namaste Alex! I'm Disha, your AI wellness coach. I'm here to listen, answer your health questions, and guide your daily nutrition & movement. What would you like to focus on today?",
    timestamp: '9:30 AM',
    suggestions: [
      'Help me plan my day',
      'Explain my recent lab report',
      'Suggest a balanced dinner',
      'How to lower insulin spikes?',
    ],
  },
  {
    id: 'msg_2',
    sender: 'user',
    text: 'What should I eat before my 5 PM strength yoga session?',
    timestamp: '9:32 AM',
  },
  {
    id: 'msg_3',
    sender: 'coach',
    text: "For a high-intensity strength yoga session at 5 PM, aim for easily digestible complex carbs with a touch of healthy fat around 3:45–4:00 PM.\n\nGreat options:\n• 1-2 Medjool dates with 4 soaked almonds\n• Small bowl of roasted makhana (foxnuts) seasoned with pink salt\n• Half an apple with 1 spoon of almond butter\n\nAvoid heavy oily snacks right before, so your prana and core remain light!",
    timestamp: '9:33 AM',
    suggestions: [
      'Remind me at 3:45 PM',
      'View today’s full plan',
      'Tell me about post-workout hydration',
    ],
    actionLink: {
      type: 'open_plan',
      label: 'View Your Today Plan',
    },
  },
];

export const coachResponses: Record<string, { text: string; suggestions: string[]; actionLink?: { type: 'open_plan' | 'open_checkin' | 'open_labs'; label: string } }> = {
  'help me plan my day': {
    text: "Here is your optimal rhythm for today:\n\n1. Morning: Completed Surya Namaskar & Moong Bowl\n2. 1:30 PM: Balanced lunch (fiber first: cucumber salad, then dal & subzi)\n3. 4:00 PM: Pre-workout fuel (dates & walnuts)\n4. 5:00 PM: Strength & Sweat Yoga (45m)\n5. 7:30 PM: Light high-protein dinner (Methi Thepla with A2 curd)\n6. 10:00 PM: Digital sunset & warm turmeric milk",
    suggestions: ['Start workout now', 'Log my lunch', 'Adjust timings'],
    actionLink: {
      type: 'open_plan',
      label: 'Open Full Routine',
    },
  },
  'explain my recent lab report': {
    text: "I analyzed your latest metabolic panel:\n\n• HbA1c is at 5.4% (Optimal! Well within the non-diabetic range)\n• Fasting Insulin is 8.2 µIU/mL (Very good sensitivity)\n• Vitamin D3 is 26 ng/mL (Slightly borderline — recommended is 40+)\n• TSH is 2.1 mIU/L (Euthyroid healthy balance)\n\nTip: 15 minutes of mid-morning sun exposure or a physician-advised D3 weekly supplement will lift your afternoon vitality even further!",
    suggestions: ['View full lab breakdown', 'Diet tips for Vitamin D', 'Ask about thyroid'],
    actionLink: {
      type: 'open_labs',
      label: 'Review Biomarker Details',
    },
  },
  'suggest a balanced dinner': {
    text: "For tonight's metabolic-friendly dinner, try:\n\n🍛 Warm Moong & Quinoa Khichdi loaded with grated zucchini, carrots, and cumin-tempered ghee.\n🥗 Side of lightly sauteed paneer or tofu (100g) with chat masala.\n\nThis gives you 24g clean protein, low glycemic impact, and soothing digestive warmth before bedtime.",
    suggestions: ['Add to my plan', 'Swap paneer for vegan option', 'How many calories?'],
    actionLink: {
      type: 'open_plan',
      label: 'Add to Dinner Plan',
    },
  },
  'how to lower insulin spikes?': {
    text: "Here are 3 research-backed golden rules:\n\n1. 'Clothes on your carbs': Never eat refined carbs alone. Always pair them with dietary fiber, protein, or good fats.\n2. Order of eating: Start your meal with greens/fiber, then protein, and finish with grains.\n3. The 10-Minute Post-Meal Stroll: Light walking immediately after food prompts muscle GLUT4 receptors to absorb glucose without triggering large insulin surges.",
    suggestions: ['Remind me to walk after lunch', 'Check my energy check-in', 'Explain HbA1c'],
    actionLink: {
      type: 'open_checkin',
      label: 'Log Current Energy',
    },
  },
};

