"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXERCISE_CATALOG = void 0;
exports.getSuggestedExercises = getSuggestedExercises;
exports.EXERCISE_CATALOG = [
    // Shoulders (Home-based)
    {
        id: 'shoulder_wall_angels',
        name: 'Wall Angels',
        body_part: 'shoulders',
        sets: 3,
        reps_or_seconds: '10-12 reps',
        rest_seconds: 45,
        cues: ['Keep spine, elbows, and wrists flat against the wall', 'Glide arms up smoothly without arching lower back'],
        avoid_if: [],
    },
    {
        id: 'shoulder_arm_circles',
        name: 'Arm Circles & Shoulder Rolls',
        body_part: 'shoulders',
        sets: 3,
        reps_or_seconds: '30 seconds',
        rest_seconds: 30,
        cues: ['Stand tall with feet shoulder-width apart', 'Make smooth controlled circles forward, then reverse'],
        avoid_if: [],
    },
    {
        id: 'shoulder_doorway_rotator_stretch',
        name: 'Doorway External Rotation & Mobility Stretch',
        body_part: 'shoulders',
        sets: 3,
        reps_or_seconds: '30 seconds per side',
        rest_seconds: 30,
        cues: ['Rest elbow at 90 degrees against doorway', 'Gently step forward to feel a mild chest and shoulder stretch'],
        avoid_if: [],
    },
    {
        id: 'shoulder_light_lateral_raises',
        name: 'Bodyweight / Light Bottle Lateral Raises',
        body_part: 'shoulders',
        sets: 3,
        reps_or_seconds: '12-15 reps',
        rest_seconds: 45,
        cues: ['Raise arms to shoulder height with elbows slightly bent', 'Pause for 1 second at top and lower with control'],
        avoid_if: ['shoulder_impingement', 'shoulder_strain', 'shoulder_pain'],
    },
    {
        id: 'shoulder_overhead_press',
        name: 'Overhead Dumbbell/Bottle Press',
        body_part: 'shoulders',
        sets: 3,
        reps_or_seconds: '8-10 reps',
        rest_seconds: 60,
        cues: ['Press straight overhead without arching lower back', 'Lower slowly to ear level with elbows under wrists'],
        avoid_if: ['shoulder_pain', 'shoulder_strain', 'shoulder_injury', 'shoulder/neck strain', 'neck_strain'],
    },
    // Chest (Home-based)
    {
        id: 'chest_wall_pushup',
        name: 'Wall Pushups',
        body_part: 'chest',
        sets: 3,
        reps_or_seconds: '12-15 reps',
        rest_seconds: 45,
        cues: ['Stand arm-length from wall, palms flat at shoulder height', 'Lower chest gently toward wall and push back'],
        avoid_if: [],
    },
    {
        id: 'chest_incline_pushup',
        name: 'Incline Bed/Couch Pushups',
        body_part: 'chest',
        sets: 3,
        reps_or_seconds: '10-12 reps',
        rest_seconds: 60,
        cues: ['Hands on sturdy edge of couch or bed', 'Keep body in straight plank line from head to heels'],
        avoid_if: ['wrist_pain'],
    },
    {
        id: 'chest_standard_pushup',
        name: 'Standard Floor Pushups',
        body_part: 'chest',
        sets: 3,
        reps_or_seconds: '8-12 reps',
        rest_seconds: 60,
        cues: ['Hands slightly wider than shoulders', 'Lower chest to 2 inches off floor, elbows at 45-degree angle'],
        avoid_if: ['wrist_pain', 'shoulder_pain'],
    },
    {
        id: 'chest_isometric_squeeze',
        name: 'Isometric Prayer Palm Press',
        body_part: 'chest',
        sets: 3,
        reps_or_seconds: '20 seconds hold',
        rest_seconds: 30,
        cues: ['Press palms firmly together in front of chest', 'Contract chest muscles hard while breathing steadily'],
        avoid_if: [],
    },
    {
        id: 'chest_floor_flyes',
        name: 'Floor Light Bottle Flyes',
        body_part: 'chest',
        sets: 3,
        reps_or_seconds: '12 reps',
        rest_seconds: 45,
        cues: ['Lie on floor so elbows stop before overstretching shoulders', 'Squeeze chest as you bring bottles together at top'],
        avoid_if: ['shoulder_pain', 'shoulder_strain'],
    },
    // Back (Home-based)
    {
        id: 'back_doorframe_rows',
        name: 'Doorframe Bodyweight Rows',
        body_part: 'back',
        sets: 3,
        reps_or_seconds: '10-12 reps',
        rest_seconds: 45,
        cues: ['Hold doorframe with both hands at chest height', 'Lean back slightly and pull your chest toward the frame by squeezing shoulder blades'],
        avoid_if: [],
    },
    {
        id: 'back_bird_dog',
        name: 'Bird Dog',
        body_part: 'back',
        sets: 3,
        reps_or_seconds: '10 reps per side',
        rest_seconds: 45,
        cues: ['On all fours, extend opposite arm and leg straight out', 'Hold 2 seconds, keep hips parallel to floor'],
        avoid_if: [],
    },
    {
        id: 'back_superman',
        name: 'Superman Floor Holds',
        body_part: 'back',
        sets: 3,
        reps_or_seconds: '20-30 seconds',
        rest_seconds: 45,
        cues: ['Lie facedown, gently lift chest and thighs off floor', 'Squeeze glutes and mid-back without straining neck'],
        avoid_if: ['severe_lower_back_pain'],
    },
    {
        id: 'back_prone_w_raises',
        name: 'Prone W-Raises',
        body_part: 'back',
        sets: 3,
        reps_or_seconds: '12 reps',
        rest_seconds: 45,
        cues: ['Facedown on mat, form a W shape with your arms', 'Pinch shoulder blades down and back, lift elbows slightly'],
        avoid_if: [],
    },
    {
        id: 'back_cat_cow',
        name: 'Cat-Cow Spinal Waves',
        body_part: 'back',
        sets: 2,
        reps_or_seconds: '60 seconds',
        rest_seconds: 30,
        cues: ['Inhale arching back with chest lifted, exhale rounding spine tucking chin', 'Move fluidly with breath'],
        avoid_if: [],
    },
    // Legs & Glutes (Home-based)
    {
        id: 'legs_glute_bridges',
        name: 'Floor Glute Bridges',
        body_part: 'legs',
        sets: 3,
        reps_or_seconds: '12-15 reps',
        rest_seconds: 45,
        cues: ['Feet flat on floor, drive through heels to lift hips', 'Squeeze glutes at the top for 1 full second'],
        avoid_if: [],
    },
    {
        id: 'legs_bodyweight_squats',
        name: 'Bodyweight Air Squats',
        body_part: 'legs',
        sets: 3,
        reps_or_seconds: '12-15 reps',
        rest_seconds: 60,
        cues: ['Feet shoulder-width, send hips back like sitting in a chair', 'Keep chest proud and knees tracking in line with toes'],
        avoid_if: ['knee_pain', 'knee_injury'],
    },
    {
        id: 'legs_wall_sit',
        name: 'Wall Sit Isometric Hold',
        body_part: 'legs',
        sets: 3,
        reps_or_seconds: '30-45 seconds',
        rest_seconds: 45,
        cues: ['Back flat against wall, slide down until thighs are parallel to ground', 'Press heels into floor and breathe steadily'],
        avoid_if: ['knee_pain'],
    },
    {
        id: 'legs_standing_calf_raises',
        name: 'Standing Calf Raises',
        body_part: 'legs',
        sets: 3,
        reps_or_seconds: '15-20 reps',
        rest_seconds: 30,
        cues: ['Stand on edge of a step or flat floor', 'Rise up high on balls of feet, hold 1 sec, lower slowly'],
        avoid_if: [],
    },
    {
        id: 'legs_step_ups',
        name: 'Sturdy Chair / Step-Ups',
        body_part: 'legs',
        sets: 3,
        reps_or_seconds: '10 reps per leg',
        rest_seconds: 45,
        cues: ['Step entire foot onto sturdy chair or step', 'Drive through front heel without jumping off rear leg'],
        avoid_if: ['knee_pain'],
    },
    // Core / Abs (Home-based)
    {
        id: 'core_forearm_plank',
        name: 'Forearm Plank',
        body_part: 'core',
        sets: 3,
        reps_or_seconds: '30-45 seconds',
        rest_seconds: 45,
        cues: ['Elbows under shoulders, pull navel toward spine', 'Keep glutes squeezed and body in one straight line'],
        avoid_if: ['severe_lower_back_pain'],
    },
    {
        id: 'core_dead_bug',
        name: 'Dead Bug',
        body_part: 'core',
        sets: 3,
        reps_or_seconds: '10 reps per side',
        rest_seconds: 45,
        cues: ['Press lower back firmly into floor at all times', 'Extend opposite arm and leg slowly with full control'],
        avoid_if: [],
    },
    {
        id: 'core_bicycle_crunches',
        name: 'Controlled Bicycle Crunches',
        body_part: 'core',
        sets: 3,
        reps_or_seconds: '12 reps per side',
        rest_seconds: 45,
        cues: ['Rotate torso to bring shoulder toward opposite knee', 'Slow and controlled tempo, do not pull on neck'],
        avoid_if: ['neck_strain', 'lower_back_pain'],
    },
    {
        id: 'core_lying_leg_raises',
        name: 'Lying Leg Raises',
        body_part: 'core',
        sets: 3,
        reps_or_seconds: '10-12 reps',
        rest_seconds: 45,
        cues: ['Hands under hips to support lower back', 'Raise legs to 90 degrees and lower slowly without arching back'],
        avoid_if: ['lower_back_pain'],
    },
    {
        id: 'core_russian_twists',
        name: 'Seated Russian Twists',
        body_part: 'core',
        sets: 3,
        reps_or_seconds: '12 reps per side',
        rest_seconds: 45,
        cues: ['Lean back at 45-degree angle with chest tall', 'Rotate ribs side to side engaging your obliques'],
        avoid_if: ['lower_back_pain'],
    },
    // Yoga & Calming Mobility
    {
        id: 'yoga_childs_pose',
        name: 'Balasana (Child\'s Pose)',
        body_part: 'yoga',
        sets: 2,
        reps_or_seconds: '60 seconds',
        rest_seconds: 30,
        cues: ['Knees wide, big toes touching, sit hips back onto heels', 'Extend arms forward resting forehead on mat with deep belly breaths'],
        avoid_if: ['severe_knee_injury'],
    },
    {
        id: 'yoga_downward_dog',
        name: 'Adho Mukha Svanasana (Downward Dog)',
        body_part: 'yoga',
        sets: 2,
        reps_or_seconds: '45 seconds',
        rest_seconds: 30,
        cues: ['Push hips up and back, pedal feet gently', 'Keep hands shoulder-width with fingers spread wide'],
        avoid_if: ['severe_wrist_pain'],
    },
    {
        id: 'yoga_cobra_pose',
        name: 'Bhujangasana (Gentle Cobra Pose)',
        body_part: 'yoga',
        sets: 2,
        reps_or_seconds: '30 seconds',
        rest_seconds: 30,
        cues: ['Lie prone, hands under shoulders', 'Gently lift chest using back muscles, shoulders away from ears'],
        avoid_if: ['severe_lower_back_pain'],
    },
    {
        id: 'yoga_warrior_1',
        name: 'Virabhadrasana I (Warrior 1)',
        body_part: 'yoga',
        sets: 2,
        reps_or_seconds: '30 seconds per leg',
        rest_seconds: 30,
        cues: ['Front knee bent at 90 degrees, back foot angled at 45 degrees', 'Reach arms up tall while sinking hips down and forward'],
        avoid_if: [],
    },
    {
        id: 'yoga_tree_pose',
        name: 'Vrikshasana (Tree Pose)',
        body_part: 'yoga',
        sets: 2,
        reps_or_seconds: '30 seconds per leg',
        rest_seconds: 30,
        cues: ['Place foot on inner calf or thigh (avoid placing on knee)', 'Find a focal point ahead and bring palms to chest'],
        avoid_if: [],
    },
];
/**
 * Filter exercises from catalog by body part, open issues, and conditions.
 */
function getSuggestedExercises(params) {
    const { body_part, userIssues = [], conditions = [], limit = 4 } = params;
    // Build a set of contraindication keywords
    const contraindications = new Set();
    userIssues.forEach((i) => {
        const t = i.title.toLowerCase();
        if (t.includes('shoulder') || t.includes('neck')) {
            contraindications.add('shoulder_pain');
            contraindications.add('shoulder_strain');
            contraindications.add('shoulder_injury');
            contraindications.add('shoulder/neck strain');
            contraindications.add('neck_strain');
        }
        if (t.includes('knee') || t.includes('joint')) {
            contraindications.add('knee_pain');
            contraindications.add('knee_injury');
        }
        if (t.includes('back')) {
            contraindications.add('lower_back_pain');
        }
    });
    conditions.forEach((c) => {
        const t = c.toLowerCase();
        if (t.includes('shoulder'))
            contraindications.add('shoulder_pain');
        if (t.includes('knee'))
            contraindications.add('knee_pain');
        if (t.includes('back'))
            contraindications.add('lower_back_pain');
    });
    let filtered = exports.EXERCISE_CATALOG.filter((ex) => {
        // 1. Body part matching if requested
        if (body_part && body_part !== 'full_body') {
            const bp = body_part.toLowerCase();
            if (bp.includes('shoulder') && ex.body_part !== 'shoulders')
                return false;
            if (bp.includes('chest') && ex.body_part !== 'chest')
                return false;
            if (bp.includes('back') && ex.body_part !== 'back')
                return false;
            if ((bp.includes('leg') || bp.includes('quad') || bp.includes('glute')) && ex.body_part !== 'legs')
                return false;
            if ((bp.includes('core') || bp.includes('abs') || bp.includes('ab')) && ex.body_part !== 'core')
                return false;
            if ((bp.includes('yoga') || bp.includes('stretch') || bp.includes('mobility')) && ex.body_part !== 'yoga')
                return false;
        }
        // 2. Filter out contraindications
        for (const tag of ex.avoid_if) {
            if (contraindications.has(tag.toLowerCase())) {
                return false;
            }
        }
        return true;
    });
    return filtered.slice(0, limit);
}
