import { serializeStatement } from '../shared/openui/serialize.js';
import type { RequestData, Turn } from '../shared/contracts.js';
import { ScreenDocument } from '../shared/openui/document.js';

// Clean Intake Staging Screens (No MCQs on Stage - Chat Drives Intake)
const hiitIntakeFixture = `root = Screens([hiit_in_screen], hiit_in_screen)
hiit_in_screen = Screen([hiit_in_title, hiit_in_desc, hiit_in_b1, hiit_in_b2, hiit_in_b3, hiit_in_cue])
hiit_in_title = Text("Coach Aira · Metabolic HIIT Intake", "title")
hiit_in_desc = Text("Aira is configuring your interval protocol. Please answer the 3 intake questions directly in chat to customize your exercises, interval ratios, and explosive tempo.", "description")
hiit_in_b1 = MetricBadge("Target Zone", "Zone 4/5 Explosive", "fire")
hiit_in_b2 = MetricBadge("Intake Status", "Question 1 in Chat", "volt")
hiit_in_b3 = MetricBadge("Variations", "5 High-Output Drills", "cyan")
hiit_in_cue = Cue("Metabolic HIIT intake active. Choose your interval format in chat to proceed.")`;

const strengthIntakeFixture = `root = Screens([str_in_screen], str_in_screen)
str_in_screen = Screen([str_in_title, str_in_desc, str_in_b1, str_in_b2, str_in_b3, str_in_cue])
str_in_title = Text("Coach Aira · Compound Strength Intake", "title")
str_in_desc = Text("Aira is configuring your compound lifting routine. Please answer the 3 intake questions directly in chat to customize your split, loading, and joint safeguards.", "description")
str_in_b1 = MetricBadge("Stimulus", "Hypertrophy & Overload", "volt")
str_in_b2 = MetricBadge("Intake Status", "Question 1 in Chat", "cyan")
str_in_b3 = MetricBadge("Variations", "5 Heavy Compound Lifts", "fire")
str_in_cue = Cue("Compound Strength intake active. Select your training split in chat to proceed.")`;

const mobilityIntakeFixture = `root = Screens([mob_in_screen], mob_in_screen)
mob_in_screen = Screen([mob_in_title, mob_in_desc, mob_in_b1, mob_in_b2, mob_in_b3, mob_in_cue])
mob_in_title = Text("Coach Aira · Mobility & Core Intake", "title")
mob_in_desc = Text("Aira is configuring your joint restoration flow and core stability sequence. Please answer the 3 intake questions directly in chat to tailor your movements.", "description")
mob_in_b1 = MetricBadge("Target", "Parasympathetic Flow", "cyan")
mob_in_b2 = MetricBadge("Intake Status", "Question 1 in Chat", "volt")
mob_in_b3 = MetricBadge("Variations", "5 Restorative Drills", "neutral")
mob_in_cue = Cue("Mobility & Core intake active. Select your joint restriction target in chat to proceed.")`;

// 5-Variation Workouts with Clean Exercise & Set Progression (Zero In-Stage MCQs)
const hiitWorkoutFixture = `root = Screens([w_intro, w_drill1, w_rest1, w_drill2, w_rest2, w_drill3, w_rest3, w_drill4, w_rest4, w_drill5, w_summary], w_intro)
w_intro = Screen([intro_title, intro_desc, badge_dur, badge_cal, badge_lvl, intro_cue])
intro_title = Text("Coach Aira · 15-Min High Voltage Circuit", "title")
intro_desc = Text("Welcome to today's metabolic burn session. Combining functional compound movements with active recovery intervals across 5 progressive drills. Focus on disciplined tempo and explosive power.", "description")
badge_dur = MetricBadge("Duration", "15 Mins", "cyan")
badge_cal = MetricBadge("Est. Burn", "240 kcal", "fire")
badge_lvl = MetricBadge("Target Zone", "Zone 4/5 Redline", "volt")
intro_cue = Cue("Lace up, athlete! Today's session features 5 high-intensity variations with active recovery intervals. Hit Next to begin Variation 1!")

w_drill1 = Screen([d1_card, d1_stat, d1_cue])
d1_card = ExerciseCard("Dumbbell Goblet Squats", "Quads, Glutes & Core", "3 Sets · 12 Reps (3-0-1 Tempo)", "Keep elbows tucked inside knees, drive aggressively through heels, and exhale at the top.")
d1_stat = MetricBadge("Tempo Target", "3s Down · 1s Up", "volt")
d1_cue = Cue("Variation 1: Dumbbell Goblet Squats! 3 working sets. Brace your abs like you are taking a punch and explode upward!")

w_rest1 = Screen([r1_title, r1_timer, r1_cue])
r1_title = Text("Inter-Variation Recovery · Shake Out", "title")
r1_timer = Timer("Transition Rest", 45)
r1_cue = Cue("Shake out your legs, athlete. Sip water and regulate breathing: 4-second inhale through nose, 4-second exhale.")

w_drill2 = Screen([d2_card, d2_stat, d2_cue])
d2_card = ExerciseCard("Explosive Push-Up to Mountain Climber", "Chest, Shoulders & Core", "3 Sets · 40 Seconds Max Effort", "Maintain a rigid plank line. Do not let your lower back sag as fatigue sets in.")
d2_stat = MetricBadge("Intensity", "Peak Heart Rate Zone 4", "fire")
d2_cue = Cue("Variation 2: Push-Ups to Mountain Climbers! 3 sets. Push the floor away and keep those knees driving fast!")

w_rest2 = Screen([r2_title, r2_timer, r2_cue])
r2_title = Text("Inter-Variation Recovery · Deep Breaths", "title")
r2_timer = Timer("Transition Rest", 45)
r2_cue = Cue("Catch your breath and re-oxygenate. Up next: Kettlebell Speed Swings.")

w_drill3 = Screen([d3_card, d3_stat, d3_cue])
d3_card = ExerciseCard("Kettlebell Speed Swings", "Posterior Chain, Glutes & Hamstrings", "3 Sets · 20 Reps Unbroken", "Hinge at the hips, do not squat. Snap hips forward with maximum glute contraction at lockout.")
d3_stat = MetricBadge("Burn Rate", "High Explosive Output", "fire")
d3_cue = Cue("Variation 3: Kettlebell Speed Swings! Snap your hips with explosive power. Power comes from your hips, not your arms.")

w_rest3 = Screen([r3_title, r3_timer, r3_cue])
r3_title = Text("Hydrate & Reset · Round 4 Ahead", "title")
r3_timer = Timer("Transition Rest", 30)
r3_cue = Cue("Two drills left! Sip water and stay locked in. Up next: Lateral Speed Skaters.")

w_drill4 = Screen([d4_card, d4_stat, d4_cue])
d4_card = ExerciseCard("Lateral Speed Skaters", "Glute Medius & Ankle Agility", "3 Sets · 30 Seconds Work", "Bound laterally with control. Absorb landing softly through hip and knee, maintaining athletic posture.")
d4_stat = MetricBadge("Agility", "Lateral Power & Balance", "volt")
d4_cue = Cue("Variation 4: Lateral Speed Skaters! Explode side to side. Stick each landing before pushing off!")

w_rest4 = Screen([r4_title, r4_timer, r4_cue])
r4_title = Text("Pre-Finisher Reset · Final Push", "title")
r4_timer = Timer("Pre-Finisher Rest", 30)
r4_cue = Cue("Final round between you and the finish line! Recover quickly—we leave everything on the floor in round 5.")

w_drill5 = Screen([d5_card, d5_stat, d5_cue])
d5_card = ExerciseCard("Core Hollow Body Burpees", "Full-Body Power & Trunk Stability", "3 Sets · 45 Seconds Max Effort", "Drop into plank, hold hollow body for a split second, jump feet in, and leap ceiling-ward.")
d5_stat = MetricBadge("Finisher", "Redline Anaerobic Peak", "fire")
d5_cue = Cue("Finisher Drill! Leave it all on the floor. Maximum effort on every single repetition!")

w_summary = Screen([sum_card, sum_note, sum_cue])
sum_card = WorkoutSummary("High Voltage Circuit Conquered", "245 kcal", "14:38", "980 XP")
sum_note = Text("Incredible work, athlete! You conquered all 5 exercise variations, logged 15 total working sets, and crushed peak Zone 4/5 output.", "body")
sum_cue = Cue("Workout complete! Outstanding effort and disciplined form today. Take 5 minutes to stretch, hydrate, and refuel. You earned this victory!")`;

// Compound Strength: Push Split Fixture
const strengthPushFixture = `root = Screens([sp_intro, sp_d1, sp_r1, sp_d2, sp_r2, sp_d3, sp_r3, sp_d4, sp_r4, sp_d5, sp_summary], sp_intro)
sp_intro = Screen([sp_title, sp_desc, sp_dur, sp_cal, sp_lvl, sp_cue])
sp_title = Text("Coach Aira · Compound Push Protocol", "title")
sp_desc = Text("Dedicated hypertrophy session focusing on time under tension, mechanical overload, and pristine biomechanics across 5 chest, shoulder, and triceps variations.", "description")
sp_dur = MetricBadge("Target Duration", "20 Mins", "cyan")
sp_cal = MetricBadge("Est. Burn", "210 kcal", "volt")
sp_lvl = MetricBadge("Lifting Zone", "Hypertrophy RPE 8", "fire")
sp_cue = Cue("Grab your dumbbells, athlete. 5 compound push variations today. Prioritize tempo and mind-muscle connection. Hit Next when ready to begin Variation 1!")

sp_d1 = Screen([spd1_card, spd1_stat, spd1_cue])
spd1_card = ExerciseCard("Incline Dumbbell Bench Press", "Upper Chest & Front Delts", "3 Sets · 10 Reps (3-0-1 Tempo)", "Set bench to 30 degrees. Retract shoulder blades, control the 3s descent, explode upward.")
spd1_stat = MetricBadge("Tempo Target", "3s Down · 1s Up", "volt")
spd1_cue = Cue("Variation 1: Incline Dumbbell Bench Press. 3 working sets. Keep elbows tucked at 45 degrees!")

sp_r1 = Screen([spr1_title, spr1_timer, spr1_cue])
spr1_title = Text("Inter-Variation Recovery · 60s", "title")
spr1_timer = Timer("Transition Rest", 60)
spr1_cue = Cue("Full recovery is key for hypertrophy. Catch your breath before Flat Dumbbell Bench Press.")

sp_d2 = Screen([spd2_card, spd2_stat, spd2_cue])
spd2_card = ExerciseCard("Flat Dumbbell Bench Press", "Mid Pectorals & Triceps", "3 Sets · 10-12 Reps (Controlled)", "Drive through your feet, brace your core, and squeeze your chest at the top.")
spd2_stat = MetricBadge("Target RPE", "RPE 8 · 2 Reps in Reserve", "fire")
spd2_cue = Cue("Variation 2: Flat Dumbbell Bench Press. Control the eccentric stretch at the bottom!")

sp_r2 = Screen([spr2_title, spr2_timer, spr2_cue])
spr2_title = Text("Inter-Variation Recovery · 60s", "title")
spr2_timer = Timer("Transition Rest", 60)
spr2_cue = Cue("Reset your shoulders. Up next: Seated Dumbbell Overhead Press.")

sp_d3 = Screen([spd3_card, spd3_stat, spd3_cue])
spd3_card = ExerciseCard("Seated Dumbbell Overhead Press", "Anterior Deltoids & Triceps", "3 Sets · 8-10 Reps (Strict)", "Press vertically, lock out overhead with head pushed gently through.")
spd3_stat = MetricBadge("Overload", "Vertical Press Power", "volt")
spd3_cue = Cue("Variation 3: Seated Overhead Press. Keep your ribs pulled down and glutes tight.")

sp_r3 = Screen([spr3_title, spr3_timer, spr3_cue])
spr3_title = Text("Inter-Variation Recovery · 45s", "title")
spr3_timer = Timer("Transition Rest", 45)
spr3_cue = Cue("Two isolation variations remaining. Up next: Dumbbell Lateral Raises.")

sp_d4 = Screen([spd4_card, spd4_stat, spd4_cue])
spd4_card = ExerciseCard("Standing Dumbbell Lateral Raises", "Lateral Deltoids (Shoulder Width)", "3 Sets · 12-15 Reps (Slight Lean)", "Lead with your elbows, slight forward lean, pause for 1 second at shoulder height.")
spd4_stat = MetricBadge("Pump Zone", "Metabolic Accumulation", "fire")
spd4_cue = Cue("Variation 4: Lateral Raises. Burn those side delts! Do not swing with your hips.")

sp_r4 = Screen([spr4_title, spr4_timer, spr4_cue])
spr4_title = Text("Pre-Finisher Recovery · 45s", "title")
spr4_timer = Timer("Pre-Finisher Rest", 45)
spr4_cue = Cue("Final variation ahead! Overhead Triceps Extension.")

sp_d5 = Screen([spd5_card, spd5_stat, spd5_cue])
spd5_card = ExerciseCard("Overhead Dumbbell Triceps Extension", "Long Head of Triceps", "3 Sets · 12-15 Reps (Full Stretch)", "Keep elbows pointed ceiling-ward, feel deep stretch behind head, lock out at top.")
spd5_stat = MetricBadge("Finisher", "Triceps Peak Tension", "cyan")
spd5_cue = Cue("Final variation! Squeeze your triceps at lockout on every single rep. Finish strong!")

sp_summary = Screen([spsum_card, spsum_note, spsum_cue])
spsum_card = WorkoutSummary("Compound Push Protocol Completed", "215 kcal", "19:45", "1050 XP")
spsum_note = Text("Phenomenal mechanical loading across all 5 push variations! You logged 15 heavy working sets with pristine joint biomechanics.", "body")
spsum_cue = Cue("Heavy lifting complete! Outstanding discipline on your tempos and sets today. Rehydrate and enjoy the post-workout endorphins!")`;

// Compound Strength: Pull Split Fixture
const strengthPullFixture = `root = Screens([spl_intro, spl_d1, spl_r1, spl_d2, spl_r2, spl_d3, spl_r3, spl_d4, spl_r4, spl_d5, spl_summary], spl_intro)
spl_intro = Screen([spl_title, spl_desc, spl_dur, spl_cal, spl_lvl, spl_cue])
spl_title = Text("Coach Aira · Compound Pull Protocol", "title")
spl_desc = Text("Dedicated back, lats, and posterior chain hypertrophy session across 5 compound pulling variations. Prioritizing lat engagement and spinal integrity.", "description")
spl_dur = MetricBadge("Target Duration", "22 Mins", "cyan")
spl_cal = MetricBadge("Est. Burn", "225 kcal", "volt")
spl_lvl = MetricBadge("Lifting Zone", "Heavy Pull RPE 8.5", "fire")
spl_cue = Cue("Chalk up, athlete. 5 pulling variations today. Drive with your elbows and squeeze your lats. Hit Next to launch Variation 1!")

spl_d1 = Screen([spld1_card, spld1_stat, spld1_cue])
spld1_card = ExerciseCard("Heavy Dumbbell Romanian Deadlift", "Hamstrings, Glutes & Spinal Erectors", "3 Sets · 10 Reps (3-1-1 Tempo)", "Soft bend in knees, push hips back to the rear wall, keep weights scraping shins.")
spld1_stat = MetricBadge("Posterior Load", "Hinge Mechanics RPE 8.5", "volt")
spld1_cue = Cue("Variation 1: Romanian Deadlifts. 3 working sets. Hinge deep and drive through your heels!")

spl_r1 = Screen([splr1_title, splr1_timer, splr1_cue])
splr1_title = Text("Inter-Variation Recovery · 60s", "title")
splr1_timer = Timer("Transition Rest", 60)
splr1_cue = Cue("Catch your breath and shake out your grip. Up next: Chest-Supported Dumbbell Rows.")

spl_d2 = Screen([spld2_card, spld2_stat, spld2_cue])
spld2_card = ExerciseCard("Chest-Supported Dumbbell Rows", "Latissimus Dorsi & Rhomboids", "3 Sets · 10-12 Reps (2s Squeeze)", "Drive elbows behind your torso, squeeze shoulder blades together for 2 seconds at peak.")
spld2_stat = MetricBadge("Back Thickness", "Peak Scapular Retraction", "fire")
spld2_cue = Cue("Variation 2: Chest-Supported Rows. Eliminate momentum and isolate your mid-back!")

spl_r2 = Screen([splr2_title, splr2_timer, splr2_cue])
splr2_title = Text("Inter-Variation Recovery · 60s", "title")
splr2_timer = Timer("Transition Rest", 60)
splr2_cue = Cue("Recover your nervous system. Up next: Single-Arm Dumbbell Rows.")

spl_d3 = Screen([spld3_card, spld3_stat, spld3_cue])
spld3_card = ExerciseCard("Single-Arm Dumbbell Row", "Unilateral Lat Power & Obliques", "3 Sets · 10 Reps per Side", "Pull dumbbell toward your hip crease. Keep spine neutral and avoid twisting torso.")
spld3_stat = MetricBadge("Unilateral Lat", "Full Range of Motion", "cyan")
spld3_cue = Cue("Variation 3: Single-Arm Dumbbell Rows. Pull to your pocket, not your chest!")

spl_r3 = Screen([splr3_title, splr3_timer, splr3_cue])
splr3_title = Text("Inter-Variation Recovery · 45s", "title")
splr3_timer = Timer("Transition Rest", 45)
splr3_cue = Cue("Great work! Up next: Incline Rear Delt Flyes.")

spl_d4 = Screen([spld4_card, spld4_stat, spld4_cue])
spld4_card = ExerciseCard("Incline Rear Delt Flyes", "Posterior Deltoids & Upper Trapezius", "3 Sets · 15 Reps (Slow Tempo)", "Chest down on incline bench. Open arms wide like wings, leading with back of wrists.")
spld4_stat = MetricBadge("Shoulder Health", "Posterior Chain Posture", "volt")
spld4_cue = Cue("Variation 4: Incline Rear Delt Flyes. Build strong shoulder posture!")

spl_r4 = Screen([splr4_title, splr4_timer, splr4_cue])
splr4_title = Text("Pre-Finisher Recovery · 45s", "title")
splr4_timer = Timer("Pre-Finisher Rest", 45)
splr4_cue = Cue("Final variation ahead! Incline Dumbbell Bicep Curls.")

spl_d5 = Screen([spld5_card, spld5_stat, spld5_cue])
spld5_card = ExerciseCard("Incline Dumbbell Bicep Curls", "Biceps Brachii (Long Head Stretch)", "3 Sets · 12 Reps (Strict Curl)", "Arms hanging straight down behind torso. Curl with full supination at the top.")
spld5_stat = MetricBadge("Finisher", "Bicep Peak Contraction", "fire")
spld5_cue = Cue("Final variation! Deep stretch at the bottom, hard bicep contraction at the top.")

spl_summary = Screen([splsum_card, splsum_note, splsum_cue])
splsum_card = WorkoutSummary("Compound Pull Protocol Completed", "230 kcal", "21:15", "1080 XP")
splsum_note = Text("Exceptional posterior chain recruitment! 5 pulling variations completed with strict scapular control and lat engagement.", "body")
splsum_cue = Cue("Pull session complete! Pristine biomechanics today. Hydrate and refuel with quality nutrition!")`;

// Compound Strength: Legs Split Fixture
const strengthLegsFixture = `root = Screens([slg_intro, slg_d1, slg_r1, slg_d2, slg_r2, slg_d3, slg_r3, slg_d4, slg_r4, slg_d5, slg_summary], slg_intro)
slg_intro = Screen([slg_title, slg_desc, slg_dur, slg_cal, slg_lvl, slg_cue])
slg_title = Text("Coach Aira · Compound Legs Protocol", "title")
slg_desc = Text("Dedicated quad, hamstring, glute, and calf hypertrophy session across 5 compound lower body variations.", "description")
slg_dur = MetricBadge("Target Duration", "22 Mins", "cyan")
slg_cal = MetricBadge("Est. Burn", "260 kcal", "fire")
slg_lvl = MetricBadge("Lifting Zone", "Heavy Legs RPE 8.5", "volt")
slg_cue = Cue("Brace your core, athlete. 5 lower body variations today. Full range of motion and disciplined tempo. Hit Next to begin Variation 1!")

slg_d1 = Screen([slgd1_card, slgd1_stat, slgd1_cue])
slgd1_card = ExerciseCard("Dumbbell Goblet Squats", "Quadriceps, Glutes & Adductors", "3 Sets · 12 Reps (3-0-1 Tempo)", "Hold dumbbell tight against sternum. Spread knees over toes, descend deep, drive through midfoot.")
slgd1_stat = MetricBadge("Quad Drive", "Deep Knee Flexion", "volt")
slgd1_cue = Cue("Variation 1: Goblet Squats. 3 working sets. Keep chest tall and drive hard out of the hole!")

slg_r1 = Screen([slgr1_title, slgr1_timer, slgr1_cue])
slgr1_title = Text("Inter-Variation Recovery · 60s", "title")
slgr1_timer = Timer("Transition Rest", 60)
slgr1_cue = Cue("Catch your breath and shake out your quads. Up next: Romanian Deadlifts.")

slg_d2 = Screen([slgd2_card, slgd2_stat, slgd2_cue])
slgd2_card = ExerciseCard("Dumbbell Romanian Deadlift", "Hamstrings & Gluteus Maximus", "3 Sets · 10 Reps (3-1-1 Tempo)", "Hinge backwards at your hips. Keep dumbbells close to legs, feel the hamstring stretch.")
slgd2_stat = MetricBadge("Posterior Tension", "Hamstring Eccentric Load", "fire")
slgd2_cue = Cue("Variation 2: Romanian Deadlifts. Push hips back to the rear wall!")

slg_r2 = Screen([slgr2_title, slgr2_timer, slgr2_cue])
slgr2_title = Text("Inter-Variation Recovery · 60s", "title")
slgr2_timer = Timer("Transition Rest", 60)
slgr2_cue = Cue("Recover your energy. Up next: Bulgarian Split Squats.")

slg_d3 = Screen([slgd3_card, slgd3_stat, slgd3_cue])
slgd3_card = ExerciseCard("Bulgarian Split Squats", "Unilateral Quads & Glute Medius", "3 Sets · 10 Reps per Leg", "Rear foot elevated on bench. Lower hips down and back until front thigh is parallel to ground.")
slgd3_stat = MetricBadge("Unilateral Drive", "Glute Stabilization", "cyan")
slgd3_cue = Cue("Variation 3: Bulgarian Split Squats. Stay tall and balance through front foot!")

slg_r3 = Screen([slgr3_title, slgr3_timer, slgr3_cue])
slgr3_title = Text("Inter-Variation Recovery · 45s", "title")
slgr3_timer = Timer("Transition Rest", 45)
slgr3_cue = Cue("Shake out your legs. Up next: Dumbbell Walking Lunges.")

slg_d4 = Screen([slgd4_card, slgd4_stat, slgd4_cue])
slgd4_card = ExerciseCard("Dumbbell Walking Lunges", "Quads, Hamstrings & Core Balance", "3 Sets · 12 Reps per Leg", "Step forward into a deep lunge, kissing back knee gently to floor. Explode into next step.")
slgd4_stat = MetricBadge("Dynamic Legs", "Athletic Locomotion", "volt")
slgd4_cue = Cue("Variation 4: Walking Lunges. Smooth continuous steps with strict posture!")

slg_r4 = Screen([slgr4_title, slgr4_timer, slgr4_cue])
slgr4_title = Text("Pre-Finisher Recovery · 45s", "title")
slgr4_timer = Timer("Pre-Finisher Rest", 45)
slgr4_cue = Cue("Final variation ahead! Standing Calf Raises.")

slg_d5 = Screen([slgd5_card, slgd5_stat, slgd5_cue])
slgd5_card = ExerciseCard("Standing Dumbbell Calf Raises", "Gastrocnemius & Soleus", "3 Sets · 15-20 Reps (2s Hold)", "Rise onto balls of feet, hold 2 seconds at peak, lower slowly for deep Achilles stretch.")
slgd5_stat = MetricBadge("Finisher", "Calf Peak Burn", "fire")
slgd5_cue = Cue("Final variation! Squeeze calves at the very top of each rep. Finish strong!")

slg_summary = Screen([slgsum_card, slgsum_note, slgsum_cue])
slgsum_card = WorkoutSummary("Compound Legs Protocol Completed", "265 kcal", "22:40", "1160 XP")
slgsum_note = Text("Tremendous lower body volume! You completed 15 heavy working sets across all 5 compound leg variations.", "body")
slgsum_cue = Cue("Leg workout conquered! Tremendous output today. Make sure to hydrate and stretch your quads and hamstrings!")`;

// Mobility & Core Restoration Fixture
const mobilityWorkoutFixture = `root = Screens([mb_intro, mb_d1, mb_r1, mb_d2, mb_r2, mb_d3, mb_r3, mb_d4, mb_r4, mb_d5, mb_summary], mb_intro)
mb_intro = Screen([mb_title, mb_desc, mb_dur, mb_cal, mb_cue])
mb_title = Text("Coach Aira · Mobility & Core Restoration", "title")
mb_desc = Text("Decompress your spine, unlock your hip capsules, and restore rotational core stability after intense training days across 5 gentle flow variations.", "description")
mb_dur = MetricBadge("Duration", "12 Mins", "cyan")
mb_cal = MetricBadge("Restoration", "Parasympathetic Flow", "volt")
mb_cue = Cue("Drop your shoes, athlete. Today we breathe, mobilize sticky joints, and strengthen deep stabilizer muscles across 5 variations. Hit Next to begin Variation 1!")

mb_d1 = Screen([mbd1_card, mbd1_cue])
mbd1_card = ExerciseCard("90/90 Hip Capsule Rotations", "Hip Internal & External Rotators", "3 Sets · 10 Controlled Reps per Side", "Sit upright with knees bent at 90 degrees. Transition smoothly without lifting hands off floor if possible.")
mbd1_cue = Cue("Variation 1: 90/90 Hip Rotations. 3 sets. Breathe into your pelvic floor and hips. Move slow and controlled through the rotational arc.")

mb_r1 = Screen([mbr1_title, mbr1_timer, mbr1_cue])
mbr1_title = Text("Decompression Flow · 30s", "title")
mbr1_timer = Timer("Transition Flow", 30)
mbr1_cue = Cue("Deep belly breaths through the nose. Let tension melt away. Up next: Thoracic Needle Thread.")

mb_d2 = Screen([mbd2_card, mbd2_cue])
mbd2_card = ExerciseCard("Thoracic Needle Thread & Cat-Cow", "Thoracic Spine & Scapular Gliding", "3 Sets · 45 Seconds Fluid Flow", "From all fours, slide one arm underneath your chest while rotating head and gaze toward ceiling.")
mbd2_cue = Cue("Variation 2: Thoracic Needle Thread. 3 sets. Open up your ribcage and relieve mid-back stiffness!")

mb_r2 = Screen([mbr2_title, mbr2_timer, mbr2_cue])
mbr2_title = Text("Spinal Reset · 30s", "title")
mbr2_timer = Timer("Transition Flow", 30)
mbr2_cue = Cue("Lengthen your neck and shoulders. Up next: Dead Bug with Hollow Body Hold.")

mb_d3 = Screen([mbd3_card, mbd3_cue])
mbd3_card = ExerciseCard("Dead Bug with Core Hollow Body Hold", "Transverse Abdominis & Pelvic Floor", "3 Sets · 12 Slow Reps + 15s Hold", "Press lower back firmly into the floor. Lower opposite arm and leg while maintaining abdominal tension.")
mbd3_cue = Cue("Variation 3: Dead Bug with Hollow Hold. 3 sets. No arching through your spine! Crush the ground with your lower back.")

mb_r3 = Screen([mbr3_title, mbr3_timer, mbr3_cue])
mbr3_title = Text("Core Reset · 30s", "title")
mbr3_timer = Timer("Transition Flow", 30)
mbr3_cue = Cue("Breathe deep into your diaphragm. Up next: Bird Dog with Glute Extension.")

mb_d4 = Screen([mbd4_card, mbd4_cue])
mbd4_card = ExerciseCard("Bird Dog with Glute Extension", "Multifidus, Glute Max & Core Anti-Rotation", "3 Sets · 10 Reps per Side", "Reach opposite hand and foot straight out. Maintain level pelvis without tilting hips.")
mbd4_cue = Cue("Variation 4: Bird Dog. 3 sets. Squeeze glutes at full extension without overarching lumbar spine!")

mb_r4 = Screen([mbr4_title, mbr4_timer, mbr4_cue])
mbr4_title = Text("Deep Breath Reset · 30s", "title")
mbr4_timer = Timer("Transition Flow", 30)
mbr4_cue = Cue("Final variation ahead! Deep Cossack Squat & Ankle Flow.")

mb_d5 = Screen([mbd5_card, mbd5_cue])
mbd5_card = ExerciseCard("Deep Cossack Squat & Ankle Flow", "Adductors, Hamstrings & Ankle Dorsiflexion", "3 Sets · 40 Seconds per Side", "Shift weight deep into one hip while keeping the opposite leg straight with toes pointed up.")
mbd5_cue = Cue("Final variation! Sink deep into your adductors and mobilize tight ankles.")

mb_summary = Screen([mbsum_card, mbsum_note, mbsum_cue])
mbsum_card = WorkoutSummary("Mobility & Core Flow Complete", "95 kcal", "11:20", "850 XP")
mbsum_note = Text("Joint restoration complete! You unlocked hip mobility, freed thoracic rotation, and reinforced deep core bracing across all 5 variations.", "body")
mbsum_cue = Cue("Session complete! Notice how much looser your hips and lower back feel. Walk it out and enjoy the rest of your day!")`;

export function mockTurn(request: RequestData, fixture: string): Turn {
  const last = request.messages.at(-1)?.content.trim().toLowerCase() ?? '';
  const fence = (code: string) => '```openui\n' + code + '\n```';

  // Demo / Sample fixture for automated grader tests
  if (last === 'load wiring sample' || last === '/demo') {
    return { reply: 'Wiring fixture loaded. This is deterministic, not a model interpreting your skill.\n' + fence('root = Screens([])') + '\n' + fence(fixture) };
  }

  // Past Session Review Retrospectives
  if (last.startsWith('review past session:')) {
    const session = last.replace('review past session:', '').trim();
    const details = session.includes('push')
      ? 'Sat · 13 Feb · Chest & Shoulders (High Intensity). 18 working sets across 42 minutes. Peak burn: 340 kcal. Peak zone: Zone 4 (86%). Biomechanical notes: Strict 3-0-1 dumbbell press tempo. AI Recovery: Restored. Predicted for tomorrow: Pull & Core (Heavy Deadlifts & Rows).'
      : session.includes('legs')
      ? 'Thu · 11 Feb · Quads & Calves (Med Intensity). 16 working sets across 38 minutes. Peak burn: 280 kcal. Telemetry notes: Deep barbell squats with pristine knee tracking. Predicted: Active Recovery.'
      : session.includes('pull')
      ? 'Mon · 08 Feb · Heavy Back & Core (High Intensity). 20 working sets across 46 minutes. Peak burn: 360 kcal. Telemetry notes: Strict lat engagement on weighted pull-ups. Predicted: Chest & Triceps.'
      : 'Wed · 10 Feb · Spine & Hip Flow (Low Intensity). 12 minutes restorative breathwork. Peak burn: 95 kcal. Restored pelvic rotation and hip capsule range.';
    return {
      reply: `Coach Aira: "Past Session Retrospective: ${details}"`
    };
  }

  // Athlete Profile Sync
  if (last.startsWith('profile update:')) {
    return {
      reply: 'Coach Aira: "Athlete Bio Synchronized! Height: 182cm | Weight: 78kg | Calculated BMI: 23.5 (Healthy Weight). Training split: Push / Pull / Legs (PPL). Calorie burn & MET coefficients adjusted to Cunningham metabolic baselines. Ready to calibrate your next session!"'
    };
  }

  // ==========================================
  // 3-QUESTION CHAT INTAKE: STEP 1 (Initiate)
  // ==========================================
  if (last.startsWith('start hiit workout intake') || (last.includes('hiit') && (last.includes('intake') || last.includes('start')) && !last.includes('swap'))) {
    const meta = last.includes(':') ? last.split(':')[1].trim() : '15m · High';
    return {
      reply: `Coach Aira: "Metabolic HIIT Protocol Initiated (${meta})! Let's lock in your 3-point intake in chat to personalize today's interval blocks.\n\nQuestion 1 of 3: What interval protocol format are we running today?\n[A] Tabata Micro-Bursts (20s Max Effort / 10s Rest Intervals)\n[B] EMOM Density (Every Minute on the Minute · 40s Work / 20s Rest)\n[C] Athletic Conditioning (45s High Output / 15s Transition)"\n` + fence('root = Screens([])') + '\n' + fence(hiitIntakeFixture)
    };
  }

  if (last.startsWith('start compound strength intake') || (last.includes('strength') && (last.includes('intake') || last.includes('start')) && !last.includes('swap'))) {
    const meta = last.includes(':') ? last.split(':')[1].trim() : '1.0h · High';
    return {
      reply: `Coach Aira: "Compound Strength Protocol Initiated (${meta})! Let's calibrate your split, loading, and joint safeguards in chat.\n\nQuestion 1 of 3: Which training split are you conquering today?\n[A] Push Focus (Chest, Anterior Shoulders & Triceps Overload)\n[B] Pull Focus (Lats, Upper Back & Bicep Power)\n[C] Legs & Posterior Chain (Quads, Glutes & Hamstrings)\n[D] Full Body Compound (Squat, Press & Hinge Hybrid)"\n` + fence('root = Screens([])') + '\n' + fence(strengthIntakeFixture)
    };
  }

  if (last.startsWith('start mobility intake') || (last.includes('mobility') && (last.includes('intake') || last.includes('start')) && !last.includes('swap'))) {
    const meta = last.includes(':') ? last.split(':')[1].trim() : '30m · Med';
    return {
      reply: `Coach Aira: "Mobility & Core Restoration Initiated (${meta})! Let's dial in your joint focus and core stability in chat.\n\nQuestion 1 of 3: What is your primary joint restriction or target area?\n[A] Hips & Pelvic Capsule (Deep Squat Range & Hip Rotators)\n[B] Thoracic Spine & Shoulder Girdle (T-Spine & Overhead Mobility)\n[C] Lumbar Spine & Hamstrings (Posterior Chain Decompression)"\n` + fence('root = Screens([])') + '\n' + fence(mobilityIntakeFixture)
    };
  }

  // ==========================================
  // INTAKE STEP 2: Answering Question 1 -> Ask Question 2
  // ==========================================
  // HIIT Q1 answers
  if (['tabata', 'micro-bursts', 'emom', 'density', 'athletic conditioning', '45s high output'].some(k => last.includes(k))) {
    return {
      reply: 'Coach Aira: "Interval format locked! Question 2 of 3: What movement modality and equipment do you prefer today?\n[A] Dynamic Bodyweight Plyometrics (Jumps, Burpees & Climbers)\n[B] Kettlebell & Dumbbell Power (Swings, Thrusters & Cleans)\n[C] Low-Impact High-Velocity (No-Jump Shuffles, High Knees & Drives)"'
    };
  }

  // Strength Q1 answers
  if (['push focus', 'push day', 'chest, anterior', 'pull focus', 'pull day', 'lats, upper', 'legs & posterior', 'legs day', 'quads, glutes', 'full body compound', 'multi-joint'].some(k => last.includes(k))) {
    return {
      reply: 'Coach Aira: "Split target registered! Question 2 of 3: What is your target rep scheme and loading intensity today?\n[A] Hypertrophy Volume (8–12 Reps · 3-0-1 Tempo · RPE 8)\n[B] Heavy Strength Overload (4–6 Reps · 2-1-1 Tempo · RPE 9)\n[C] Muscular Endurance & Density (12–15 Reps · 45s Rest Breaks)"'
    };
  }

  // Mobility Q1 answers
  if (['hips & pelvic', 'hip rotators', 'deep squat range', 'thoracic spine', 't-spine', 'shoulder girdle', 'lumbar spine', 'hamstrings', 'posterior chain decompression'].some(k => last.includes(k))) {
    return {
      reply: 'Coach Aira: "Joint target registered! Question 2 of 3: What core activation modality should we prioritize?\n[A] Anti-Extension & Deep Transverse Abdominis (Dead Bugs & Hollow Holds)\n[B] Anti-Rotation & Oblique Stability (Bird Dogs & Side Planks)\n[C] Dynamic Core Flow (Plank Transitions & Rotational Primers)"'
    };
  }

  // ==========================================
  // INTAKE STEP 3: Answering Question 2 -> Ask Question 3
  // ==========================================
  // HIIT Q2 answers
  if (['plyometrics', 'bodyweight plyometrics', 'kettlebell & dumbbell', 'kettlebell power', 'low-impact high-velocity', 'no-jump'].some(k => last.includes(k))) {
    return {
      reply: 'Coach Aira: "Modality registered! Question 3 of 3: What is your energy baseline and cardiovascular target today?\n[A] Redline Zone 5 (Peak Anaerobic Explosive Power)\n[B] Sustained Zone 4 (Lactate Threshold & High MET Burn)\n[C] Regulated Aerobic (Paced Intervals with Controlled Heart Rate)"'
    };
  }

  // Strength Q2 answers
  if (['hypertrophy volume', '8–12 reps', '8-12 reps', 'heavy strength overload', '4–6 reps', '4-6 reps', 'muscular endurance & density', '12–15 reps', '12-15 reps'].some(k => last.includes(k))) {
    return {
      reply: 'Coach Aira: "Loading parameters set! Question 3 of 3: Do you have any joint tweaks, soreness, or limitations today?\n[A] 100% Unrestricted · Ready for Heavy Loads\n[B] Sensitive Knees (Box Squats & Hip-Hinge Dominant)\n[C] Lower Back Tightness (Chest-Supported Rows & Supported Squats)\n[D] Shoulder Discomfort (Neutral-Grip Dumbbell Presses)"'
    };
  }

  // Mobility Q2 answers
  if (['anti-extension', 'transverse abdominis', 'dead bugs', 'anti-rotation', 'oblique stability', 'bird dogs', 'dynamic core flow', 'rotational primers'].some(k => last.includes(k))) {
    return {
      reply: 'Coach Aira: "Core focus locked! Question 3 of 3: What flow tempo and pacing do you want today?\n[A] Isometric Holds & Breath Control (5s Squeeze / Slow Exhale)\n[B] Dynamic Fluid Movement (Continuous Smooth Transitions)\n[C] Restorative Yin Flow (Long Passive Stretches & Box Breathing)"'
    };
  }

  // ==========================================
  // INTAKE COMPLETION: Question 3 -> Load Dynamic Workout
  // ==========================================
  // HIIT Q3 answers -> Load HIIT Workout
  if (['redline zone 5', 'zone 5', 'sustained zone 4', 'lactate threshold', 'regulated aerobic', 'paced intervals'].some(k => last.includes(k))) {
    const userMsgs = request.messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');
    const is45m = userMsgs.includes('45m') || userMsgs.includes('45 min');
    const is30m = userMsgs.includes('30m') || userMsgs.includes('30 min');
    const durMins = is45m ? 45 : is30m ? 30 : 15;
    const durStr = `${durMins} Mins`;
    const burnVal = is45m ? '620 kcal' : is30m ? '410 kcal' : '240 kcal';

    const isAerobic = last.includes('regulated aerobic') || last.includes('paced intervals') || userMsgs.includes(' low');
    const isRedline = last.includes('redline') || last.includes('zone 5') || userMsgs.includes(' high');
    const zoneStr = isRedline ? 'Zone 5 Redline' : isAerobic ? 'Zone 2/3 Aerobic' : 'Zone 4 Threshold';
    const zoneTone = isRedline ? 'fire' : isAerobic ? 'cyan' : 'volt';

    let fixture = hiitWorkoutFixture;
    fixture = fixture.replace(
      'intro_title = Text("Coach Aira · 15-Min High Voltage Circuit", "title")',
      `intro_title = Text("Coach Aira · ${durMins}-Min High Voltage Circuit", "title")`
    );
    fixture = fixture.replace(
      'badge_dur = MetricBadge("Duration", "15 Mins", "cyan")',
      `badge_dur = MetricBadge("Duration", "${durStr}", "cyan")`
    );
    fixture = fixture.replace(
      'badge_cal = MetricBadge("Est. Burn", "240 kcal", "fire")',
      `badge_cal = MetricBadge("Est. Burn", "${burnVal}", "fire")`
    );
    fixture = fixture.replace(
      'badge_lvl = MetricBadge("Target Zone", "Zone 4/5 Redline", "volt")',
      `badge_lvl = MetricBadge("Target Zone", "${zoneStr}", "${zoneTone}")`
    );
    fixture = fixture.replace(
      'sum_card = WorkoutSummary("High Voltage Circuit Conquered", "245 kcal", "14:38", "980 XP")',
      `sum_card = WorkoutSummary("High Voltage Circuit Conquered", "${burnVal}", "${durMins}:00", "980 XP")`
    );

    return {
      reply: `Coach Aira: "Metabolic calibration complete! Your tailored HIIT interval protocol is loaded on the Active Workout Stage.\n• Format: 5 Progressive Drills with Inter-Variation Recovery\n• Volume: 3 Sets per Drill with Active Set Timers\n• Target Heart Rate: ${zoneStr} · ${durStr}\n\nHit Next or Start Set on Drill 1 when you are ready to ignite your burn!"\n` + fence('root = Screens([])') + '\n' + fence(fixture)
    };
  }

  // Strength Q3 answers -> Load tailored strength split based on conversation context
  if (['100% unrestricted', 'ready for heavy', 'sensitive knees', 'lower back tightness', 'shoulder discomfort', 'no limitations', 'ready to push'].some(k => last.includes(k))) {
    const isKnees = last.includes('knee');
    const isBack = last.includes('back');
    const isShoulder = last.includes('shoulder');

    // Check user conversation history to see which split was requested
    const userMsgs = request.messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');
    let fixtureToLoad = strengthPushFixture;
    let splitName = 'Compound Push Protocol (Chest, Shoulders & Triceps)';

    if (userMsgs.includes('pull focus') || userMsgs.includes('pull day') || userMsgs.includes('lats, upper')) {
      fixtureToLoad = strengthPullFixture;
      splitName = 'Compound Pull Protocol (Back, Lats & Biceps)';
      if (isBack) {
        fixtureToLoad = fixtureToLoad.replace(
          'spld1_card = ExerciseCard("Heavy Dumbbell Romanian Deadlift", "Hamstrings, Glutes & Spinal Erectors", "3 Sets · 10 Reps (3-1-1 Tempo)", "Soft bend in knees, push hips back to the rear wall, keep weights scraping shins.")',
          'spld1_card = ExerciseCard("Chest-Supported Dumbbell Row & Supported Hip Thrust", "Upper Back & Glutes (Spine-Safe)", "3 Sets · 10 Controlled Reps", "Bench supports your torso, eliminating lumbar shear stress while loading posterior chain.")'
        );
      }
    } else if (userMsgs.includes('legs & posterior') || userMsgs.includes('legs day') || userMsgs.includes('quads, glutes')) {
      fixtureToLoad = strengthLegsFixture;
      splitName = 'Compound Legs Protocol (Quads, Glutes & Hamstrings)';
      if (isKnees) {
        fixtureToLoad = fixtureToLoad.replace(
          'slgd1_card = ExerciseCard("Dumbbell Goblet Squats", "Quadriceps, Glutes & Adductors", "3 Sets · 12 Reps (3-0-1 Tempo)", "Hold dumbbell tight against sternum. Spread knees over toes, descend deep, drive through midfoot.")',
          'slgd1_card = ExerciseCard("Bodyweight Box Squats", "Quads & Glutes (Low-Impact Knee-Safe)", "3 Sets · 12 Controlled Reps", "Sit back gently onto a bench to eliminate knee joint shear while loading quads.")'
        );
      }
    } else {
      // Push split
      fixtureToLoad = strengthPushFixture;
      splitName = 'Compound Push Protocol (Chest, Shoulders & Triceps)';
      if (isShoulder) {
        fixtureToLoad = fixtureToLoad.replace(
          'spd3_card = ExerciseCard("Seated Dumbbell Overhead Press", "Anterior Deltoids & Triceps", "3 Sets · 8-10 Reps (Strict)", "Press vertically, lock out overhead with head pushed gently through.")',
          'spd3_card = ExerciseCard("Neutral-Grip Dumbbell Floor Press", "Pectorals & Triceps (Shoulder-Safe)", "3 Sets · 12 Reps", "Floor eliminates extreme shoulder extension. Neutral grip protects the rotator cuff.")'
        );
      }
    }

    return {
      reply: `Coach Aira: "Strength calibration complete! Your tailored protocol is loaded on the Active Workout Stage.\n• Target Split: ${splitName}\n• Structure: 5 Compound Variations · 3 Working Sets each\n• Biomechanical Safeguards: ${isKnees ? 'Low-Impact Knee Regressions Enabled' : isBack ? 'Lumbar Decompression Enabled' : isShoulder ? 'Neutral-Grip Shoulder Track Enabled' : 'Unrestricted Full Loading'}\n\nExecute each variation, track your sets, and respect the inter-set rest breaks on the stage!"\n` + fence('root = Screens([])') + '\n' + fence(fixtureToLoad)
    };
  }

  // Mobility Q3 answers -> Load Mobility Workout
  if (['isometric holds', 'breath control', 'dynamic fluid movement', 'fluid', 'restorative yin flow', 'yin flow', 'passive stretches'].some(k => last.includes(k))) {
    return {
      reply: 'Coach Aira: "Restoration calibration complete! Your tailored Mobility & Core protocol is loaded on the Active Workout Stage.\n• Target Focus: 5 Decompression Variations\n• Volume: 3 Restorative Sets per Variation\n• Pacing: Diaphragmatic Breathwork & Controlled Holds\n\nBegin Drill 1 on the stage to decompress and mobilize!"\n' + fence('root = Screens([])') + '\n' + fence(mobilityWorkoutFixture)
    };
  }

  // Direct Shortcuts
  if (['/workout', 'start workout', 'hiit', 'start coach aira hiit session', 'start hiit', 'fat burn', 'start hiit workout'].includes(last)) {
    return {
      reply: 'Coach Aira: "Let\'s get to work! 15-Minute High Voltage HIIT circuit loaded below. 5 exercise variations with live set tracking and active recovery."\n' + fence('root = Screens([])') + '\n' + fence(hiitWorkoutFixture)
    };
  }

  if (['start strength workout', 'strength', 'hypertrophy', 'start strength', 'push day'].includes(last)) {
    return {
      reply: 'Coach Aira: "Compound Strength Push Protocol loaded! 5 heavy variations with 3 working sets each. Prioritize tempo and tension."\n' + fence('root = Screens([])') + '\n' + fence(strengthPushFixture)
    };
  }

  if (['pull day', 'start pull workout'].includes(last)) {
    return {
      reply: 'Coach Aira: "Compound Strength Pull Protocol loaded! 5 pulling variations with 3 working sets each. Drive with elbows and squeeze lats."\n' + fence('root = Screens([])') + '\n' + fence(strengthPullFixture)
    };
  }

  if (['legs day', 'start legs workout'].includes(last)) {
    return {
      reply: 'Coach Aira: "Compound Strength Legs Protocol loaded! 5 lower body variations with 3 working sets each. Deep range of motion."\n' + fence('root = Screens([])') + '\n' + fence(strengthLegsFixture)
    };
  }

  if (['start mobility workout', 'mobility', 'flow', 'core flow', 'start mobility'].includes(last)) {
    return {
      reply: 'Coach Aira: "Mobility & Core Restoration loaded. 5 restorative variations. Slow down your breath, expand range of motion, and unlock joints."\n' + fence('root = Screens([])') + '\n' + fence(mobilityWorkoutFixture)
    };
  }

  // Stepper navigation across screens
  const doc = new ScreenDocument();
  if (request.state.ui_state) doc.apply(fence(request.state.ui_state));
  const screens = doc.screens;
  const index = screens.findIndex(s => s.key === doc.cursor);

  if (['next', 'back', 'completed set', 'completed drill', 'completed workout!', 'skip rest timer', 'skip to finisher', 'finish session', 'ready for core', 'ready for set 2', 'ready for next exercise', 'ready to crush it', 'log session'].some(k => last === k || (k.length > 6 && last.includes(k))) && screens.length) {
    const isBack = last === 'back';
    const target = screens[Math.max(0, Math.min(screens.length - 1, index + (isBack ? -1 : 1)))];
    return {
      reply: `Coach Aira: "${isBack ? 'Stepping back a round.' : 'Great pace! Advancing to the next block.'}"\n` + fence(`root = Screens([${screens.map(s => s.key).join(', ')}], ${target.key})`)
    };
  }

  if (last.includes('restart workout') || last.includes('restart session')) {
    return {
      reply: 'Coach Aira: "Resetting protocol for another block. Hydrate and get ready!"\n' + fence('root = Screens([])') + '\n' + fence(hiitWorkoutFixture)
    };
  }

  if (last.includes('breathing') || last.includes('cadence')) {
    return {
      reply: 'Coach Aira: "Box-Breathing Recovery Protocol: Inhale through nose 4s, hold gently 4s, exhale smoothly through pursed lips 4s, hold empty 4s. Recovers parasympathetic tone and drops heart rate by 15-20 BPM."'
    };
  }

  if (last.includes('stretch') || last.includes('cooldown')) {
    return {
      reply: 'Coach Aira: "Post-Workout Restoration Sequence: 1) Hamstring sweeps 45s. 2) World\'s Greatest Stretch 45s per side. 3) Prone Cobra & Child\'s Pose 60s. Fantastic session, athlete! Hydrate and refuel."'
    };
  }

  if (last.includes('telemetry') || last.includes('stats') || last.includes('view stats') || last.includes('view telemetry')) {
    return {
      reply: 'Coach Aira: "Session Telemetry Diagnostic: Total Active Time: 14:38 | Estimated Burn: 245 kcal | Coach Score: 980 XP | Peak Zone Hit: Zone 4 (82% compliance) | Biomechanical Quality: 98% Pristine. Outstanding metric output!"'
    };
  }

  // Dynamic In-Workout Biomechanical Form & Injury Regressions
  if ((last.includes('knee') || last.includes('easier variation')) && doc.program.includes('d1_card =')) {
    const patched = 'd1_card = ExerciseCard("Bodyweight Box Squats", "Quads & Glutes (Low Impact)", "3 Sets · 10 Controlled Reps", "Sit back gently onto a chair or bench to eliminate joint shear stress while loading muscles.")';
    return {
      reply: 'Coach Aira: "Adjusted! Swapped Goblet Squats for Low-Impact Box Squats to protect your knees while keeping your quads engaged."\n' + fence(patched)
    };
  }

  if ((last.includes('too intense') || last.includes('knee push-ups') || last.includes('modify')) && doc.program.includes('d2_card =')) {
    const patched = 'd2_card = ExerciseCard("Incline Push-Ups / Knee Push-Ups", "Chest & Triceps (De-loaded)", "3 Sets · 12 Smooth Reps", "Elevate hands or drop to knees while maintaining a rigid core line.")';
    return {
      reply: 'Coach Aira: "Smart adjustment! De-loading push-ups to maintain pristine form without burning out your shoulders."\n' + fence(patched)
    };
  }

  if (last.includes('shoulder')) {
    if (doc.cursor === 'sp_d3' || doc.program.includes('spd3_card =')) {
      const patched = 'spd3_card = ExerciseCard("Neutral-Grip Dumbbell Floor Press", "Pectorals & Triceps (Shoulder-Safe)", "3 Sets · 12 Reps", "Floor eliminates extreme shoulder extension. Neutral grip protects the rotator cuff.")';
      return {
        reply: 'Coach Aira: "Shoulder protection active! Swapped overhead press to neutral-grip floor press to keep your rotator cuff safe."\n' + fence(patched)
      };
    }
    if (doc.program.includes('d2_card =')) {
      const patched = 'd2_card = ExerciseCard("Incline Push-Ups / Knee Push-Ups", "Chest & Triceps (De-loaded)", "3 Sets · 12 Smooth Reps", "Elevate hands or drop to knees while maintaining a rigid core line.")';
      return {
        reply: 'Coach Aira: "Shoulder protection active! De-loading push-up angle to maintain chest drive without anterior shoulder impingement."\n' + fence(patched)
      };
    }
  }

  if (last.includes('harder')) {
    if (doc.program.includes('d2_card =')) {
      const patched = 'd2_card = ExerciseCard("Plyometric Push-Up to Mountain Climber", "Chest, Power & Core (Max Voltage)", "3 Sets · 45s Max Effort (Explosive)", "Explosive push-up off the floor combined with rapid-fire mountain climber drives.")';
      return {
        reply: 'Coach Aira: "Dialed up! Upgraded to explosive plyometric push-ups. Push the tempo!"\n' + fence(patched)
      };
    }
    if (doc.program.includes('d1_card =')) {
      const patched = 'd1_card = ExerciseCard("1.5-Rep Dumbbell Goblet Squats", "Quads & Glutes (Metabolic Fire)", "3 Sets · 12 Reps (Extra Pulse)", "Drop all the way down, rise halfway up, drop down again, then stand to lockout. Unforgiving time under tension.")';
      return {
        reply: 'Coach Aira: "Challenge accepted! Upgraded to 1.5-Rep Squats with an isometric pulse at the bottom. Burn guaranteed!"\n' + fence(patched)
      };
    }
  }

  if (last.includes('rest') && (last.includes('+15') || last.includes('extend'))) {
    if (doc.program.includes('r1_timer =')) {
      const patched = 'r1_timer = Timer("Extended Rest Interval", 60)';
      return {
        reply: 'Coach Aira: "Rest extended by 15 seconds! Deep diaphragmatic breaths. Re-oxygenate before the next round."\n' + fence(patched)
      };
    }
  }

  if (last.includes('form')) {
    if (doc.cursor === 'spd1' || doc.program.includes('spd1_card =')) {
      return {
        reply: 'Coach Aira: "Form Breakdown: Set bench to 30 degrees. Retract and depress scapula. Lower weights smoothly for 3 seconds with elbows at 45 degrees, then explode upward!"'
      };
    }
    if (doc.program.includes('d1_card =')) {
      return {
        reply: 'Coach Aira: "Form Breakdown: Keep your chest vertical, flare lats to support the dumbbell, spread your knees over your 2nd and 3rd toes, and never let your heels leave the floor!"'
      };
    }
    return {
      reply: 'Coach Aira: "Form Breakdown: Squeeze glutes and brace abs to protect your lumbar spine. Maintain controlled tempo and exhale on concentric exertion."'
    };
  }

  // Grader test patch support
  if (/^change value to (\d{1,2})$/.test(last) && doc.program.includes('count1 =')) {
    const value = Number(last.match(/\d+/)![0]);
    return {
      reply: 'Fixture values patched under their existing names.\n' + fence(serializeStatement('count1', 'Keyword', [String(value), 'Sample value']) + '\n' + serializeStatement('count2', 'Keyword', [String(value), 'Second sample value']))
    };
  }

  if (last === 'create a real workout') {
    return {
      reply: 'Mock only understands /demo, /workout, next, back and “change value to 6”. It does not read your skill. Edit the fixture/mock, test a local OpenUI patch in Builder tools, or explicitly enable a live provider.'
    };
  }

  // Custom chat message athletic coaching support
  return generateCoachAiraAthleticResponse(last);
}

function generateCoachAiraAthleticResponse(userInput: string): { reply: string } {
  const query = userInput.toLowerCase();

  if (query.includes('knee') || query.includes('joint') || query.includes('pain') || query.includes('hurt') || query.includes('ache') || query.includes('injury')) {
    return {
      reply: 'Coach Aira: "Joint Integrity Alert: Safety is always priority one. If you feel acute or shearing joint discomfort, immediately reduce your depth, switch to a bodyweight isometric hold, or take an active recovery pause. Ensure your knees track in line with your 2nd and 3rd toes and your core stays braced. Never work through sharp joint pain."'
    };
  }

  if (query.includes('form') || query.includes('technique') || query.includes('posture') || query.includes('cue') || query.includes('how to')) {
    return {
      reply: 'Coach Aira: "Biomechanics Form Check: Anchor your feet firmly, pack your lats, and pull your ribcage down into your pelvis to maintain a neutral spine. Control the eccentric phase for 2 to 3 seconds before explosive concentric contraction. Exhale on concentric exertion!"'
    };
  }

  if (query.includes('rest') || query.includes('break') || query.includes('breath') || query.includes('recover')) {
    return {
      reply: 'Coach Aira: "Recovery Protocol: For maximal ATP and creatine-phosphate regeneration, use box breathing: 4 seconds in through the nose, 4 seconds hold, 4 seconds slow exhale through pursed lips. Sip water and keep light movement to avoid venous blood pooling."'
    };
  }

  if (query.includes('set') || query.includes('rep') || query.includes('weight') || query.includes('load') || query.includes('heavy') || query.includes('light')) {
    return {
      reply: 'Coach Aira: "Load & Volume Strategy: Maintain 1 to 2 reps in reserve (RIR 1-2) across your working sets. If your movement velocity slows drastically or technical form degrades, reduce load by 10% to preserve pristine biomechanics."'
    };
  }

  if (query.includes('tired') || query.includes('fatigue') || query.includes('exhaust') || query.includes('hard') || query.includes('sweat')) {
    return {
      reply: 'Coach Aira: "Mental Fortitude: Fatigue is where muscular and aerobic adaptations happen! Dial down movement speed slightly to protect form, but maintain steady cadence. You have the engine for this—breathe rhythmically and conquer this interval."'
    };
  }

  if (query.includes('water') || query.includes('drink') || query.includes('nutrition') || query.includes('protein') || query.includes('fuel')) {
    return {
      reply: 'Coach Aira: "Hydration & Fueling: Take 2-3 small sips of water or electrolyte fluid between blocks. Avoid chugging large volumes mid-drill. Post-session, aim for 25-35g of rapid-digesting protein and complex carbohydrates within 45 minutes."'
    };
  }

  if (query.includes('hi') || query.includes('hello') || query.includes('hey') || query.includes('ready') || query.includes('start')) {
    return {
      reply: 'Coach Aira: "I am locked in with you! Check your form cues above, track your sets with the active HUD, and use the split variation pills to monitor progress. Let me know if you need modifications or tempo adjustments anytime."'
    };
  }

  return {
    reply: `Coach Aira: "Athletic Guidance: Locked in on '${userInput.trim()}'. Maintain strong pelvic bracing, control your breathing cadence, and execute every repetition with intention. Track your completed sets on the HUD above or click any variation in the split bar to navigate."`
  };
}
