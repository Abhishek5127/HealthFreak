import { DailyActivityItem, WellnessGoal } from '../types';
import { mockDailyActivities } from './healthData';

export function getActivitiesForGoal(goal: WellnessGoal): DailyActivityItem[] {
  switch (goal) {
    case 'weight_gain':
      return [
        {
          id: 'act_gain_1',
          title: 'Hypertrophy Push & Overhead Press',
          category: 'movement',
          time: '07:30 AM',
          duration: '45 min',
          intensity: 'High intensity',
          tags: ['Hypertrophy', 'Progressive Overload', 'Upper Body'],
          completed: true,
          description: 'Heavy compound pressing (8-10 reps) to stimulate maximum muscle protein synthesis.',
          calories: 280,
          iconName: 'Dumbbell',
        },
        {
          id: 'act_gain_2',
          title: 'Mass Banana Peanut Butter & Sattu Shake',
          category: 'nutrition',
          time: '09:00 AM',
          tags: ['High Protein', 'Clean Surplus', 'Calorie Dense'],
          completed: true,
          description: '480 kcal clean mass fuel with 24g bioavailable protein for post-workout repair.',
          calories: 480,
          iconName: 'Utensils',
        },
        {
          id: 'act_gain_3',
          title: 'Heavy Barbell Squats & Core Bracing',
          category: 'movement',
          time: '05:30 PM',
          duration: '40 min',
          intensity: 'High intensity',
          tags: ['Compound', 'Leg Mass', 'Strength'],
          completed: false,
          description: 'Full range compound squats to recruit maximum motor units and boost growth.',
          calories: 250,
          iconName: 'Dumbbell',
        },
        {
          id: 'act_gain_4',
          title: 'Paneer Bhurji with 3 Multigrain Rotis',
          category: 'nutrition',
          time: '08:30 PM',
          tags: ['Slow Digesting Casein', 'High Protein'],
          completed: false,
          description: 'Rich in leucine and casein to maintain an anabolic state during sleep.',
          calories: 420,
          iconName: 'Salad',
        },
      ];

    case 'weight_loss':
      return [
        {
          id: 'act_loss_1',
          title: 'Fasted Morning Fat-Oxidation Walk',
          category: 'movement',
          time: '07:00 AM',
          duration: '35 min',
          intensity: 'Gentle',
          tags: ['Zone 2', 'Fat Burn', 'Low Impact'],
          completed: true,
          description: 'Zone-2 steady cardio to maximize fatty acid mobilization without elevating cortisol.',
          calories: 160,
          iconName: 'Footprints',
        },
        {
          id: 'act_loss_2',
          title: 'Sprouted Moong & Cucumber Chaat',
          category: 'nutrition',
          time: '08:30 AM',
          tags: ['High Fiber', 'Low GI', 'Hunger Blunting'],
          completed: true,
          description: 'High volume meal with 16g protein and 9g fiber to keep insulin low and satiety high.',
          calories: 190,
          iconName: 'Utensils',
        },
        {
          id: 'act_loss_3',
          title: 'Metabolic Tone HIIT & Core Tabata',
          category: 'movement',
          time: '05:00 PM',
          duration: '25 min',
          intensity: 'High intensity',
          tags: ['Afterburn', 'EPOC', 'Cardio'],
          completed: false,
          description: 'High intensity interval intervals to activate EPOC caloric afterburn for 14 hours.',
          calories: 230,
          iconName: 'Flame',
        },
        {
          id: 'act_loss_4',
          title: 'Lauki & Yellow Moong Soup + Roasted Chana',
          category: 'nutrition',
          time: '07:45 PM',
          tags: ['Calorie Deficit', 'Electrolytes', 'Light Dinner'],
          completed: false,
          description: 'Comforting, low sodium vegetable soup that enables deep sleep on a caloric deficit.',
          calories: 220,
          iconName: 'Salad',
        },
      ];

    case 'acne_control':
    case 'skincare_glow':
      return [
        {
          id: 'act_skin_1',
          title: 'Anti-Inflammatory Golden Turmeric & Lemon Water',
          category: 'habit',
          time: '07:00 AM',
          tags: ['Gut-Skin Axis', 'Detox Flush', 'Antioxidant'],
          completed: true,
          description: 'Warm water with curcumin and black pepper to reduce systemic sebum inflammation.',
          calories: 30,
          iconName: 'Sun',
        },
        {
          id: 'act_skin_2',
          title: 'Morning Salicylic Cleanser & SPF 50 Routine',
          category: 'habit',
          time: '07:30 AM',
          tags: ['Dermal Shield', 'Pore Clarifying', 'AM Skincare'],
          completed: true,
          description: 'BHA 2% pore exfoliation followed by broad-spectrum non-comedogenic sun protection.',
          calories: 0,
          iconName: 'Sparkles',
        },
        {
          id: 'act_skin_3',
          title: 'Hormone Harmony & Cortisol Reduction Yoga',
          category: 'movement',
          time: '05:30 PM',
          duration: '30 min',
          intensity: 'Gentle',
          tags: ['Stress Relief', 'Adrenal Balance', 'Lymphatic Flow'],
          completed: false,
          description: 'Parasympathetic breathwork and gentle inversions to promote clear facial lymphatic drainage.',
          calories: 120,
          iconName: 'Sparkles',
        },
        {
          id: 'act_skin_4',
          title: 'Zinc-Rich Pumpkin Seeds & Berry Moong Chilla',
          category: 'nutrition',
          time: '08:00 PM',
          tags: ['Zinc Dermal', 'Low-GI', 'Clear Skin'],
          completed: false,
          description: 'High in bioavailable zinc to inhibit 5-alpha reductase and calm active acne lesions.',
          calories: 260,
          iconName: 'Salad',
        },
      ];

    default:
      return mockDailyActivities;
  }
}
