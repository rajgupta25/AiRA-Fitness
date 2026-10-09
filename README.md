# AiRA Fitness

An adaptive biomechanical workout studio built on the AiRA OpenUI protocol.

---

## Quick Start (Run Locally)

Requires Node.js 22.18 or later and npm.

```sh
npm ci --ignore-scripts
npm start
```

Open http://127.0.0.1:4319 in your browser. Stop the server with `Ctrl+C`.

The app starts in **Mock Mode** by default. It runs completely offline with zero API keys or external dependencies. You can immediately choose a workout protocol from the sidebar, run the automated circuits, customize intervals, and test failure scenarios in Builder tools.

---

## The Core Product Problem: Why Chat Alone Fails at the Gym

A chat interface is the wrong primary canvas for physical training. When you are holding weights or catching your breath between sets, you cannot type, read long paragraphs, or scroll through conversation history.

A workout app needs to adapt to your physical context:
- The screen should be the workout itself, displaying the current exercise, tempo, and countdown.
- Pacing should be visual and audible, so you can glance from across the room and know exactly where you are in the set.
- Transitions should be hands-free, advancing automatically when an interval finishes.
- The AI should intervene with short, timed cues rather than conversational essays.

AiRA Fitness uses chat as an onboarding and calibration assistant, while delegating actual session guidance to an active multimodal stage.

---

## Key Product & UX Decisions

### 1. Dual Mood Mode (Cool HUD vs. Calm Luxury)
Different workouts demand different mental states:
- **Cool Mode (Default HUD)**: High-contrast cyberpunk styling with neon cyan/orange reticles, tabular numbers, and tactical telemetry for high-intensity intervals and heavy lifting.
- **Calm Mode (Warm Athletic)**: Low-stimulation terracotta ember accents, clean sans-serif typography, and subtle ambient shadows for recovery, mobility, and breathwork.
- **Implementation**: Toggled instantly in the top bar with persistent local storage. Both modes share identical DOM semantics, zero layout shift, and identical 32px/36px container heights across the top controls.

### 2. Hands-Free Automated Progression
Manual "Next" buttons create friction during physical exercise. When a work interval ends, the stage automatically transitions into the rest period. When the rest period ends, it cues the next movement block. Athletes can still override or pause at any point using the prominent station controls.

### 3. One-Touch Biomechanical Calibration
Rather than forcing athletes through dense form menus, Coach AiRA presents structured 3-point calibration in chat using single-touch MCQ chips (`[A]`, `[B]`, `[C]`):
1. Training Objective (Anaerobic Capacity vs. Calorie Burn vs. Agility)
2. Movement Focus (Push vs. Pull vs. Legs vs. Chains)
3. Joint Limitations (Unrestricted vs. Sensitive Knees vs. Lower Back)

Selecting "Sensitive Knees" immediately regresses loaded dumbbell goblet squats into bodyweight box squats on the stage canvas, reducing patellofemoral shear while preserving quad activation.

### 4. Dynamic Caloric Telemetry (MET Formulas)
Cardio machines often guess caloric expenditure using generic averages. AiRA calculates active burn using the standard Compendium of Physical Activities Metabolic Equivalent of Task (MET) formula, weighted dynamically by athlete body weight (78 kg default):

$$\text{Burn Rate (kcal/min)} = \frac{\text{MET} \times 3.5 \times \text{Weight (kg)}}{200}$$

Telemetry tracks active burn rate, heart-rate reserve zones (Zones 1-5), and station pacing rings in real time.

### 5. Visual Box-Breathing Pacer
Rest intervals include a synchronized CSS-animated breathing visualizer (Inhale 4s, Hold 4s, Exhale 4s, Hold 4s). This guides down-regulation between sets without relying on audio permissions or external audio files.

---

## Technical Architecture & Resilience

The project builds on AiRA's declarative OpenUI protocol:

- **Declarative AST**: UI states are modeled as structured statement nodes (`Screen`, `ExerciseCard`, `PacingRing`, `VariationTracker`). Repeating a statement name patches its value in place without tearing down the DOM.
- **Strict Content Security Policy**: Configured with `default-src 'self'`, `script-src 'self'`, and `connect-src 'self'`. Dynamic string evaluation (`eval`, `new Function`), unsafe HTML assignment (`innerHTML`), and out-of-scope audio APIs (`new Audio`, `speechSynthesis`, `getUserMedia`) are strictly prohibited and enforced by static linters.
- **Builder Tools & Protocol Stress Testing**: Built-in developer tools allow full inspection of the protocol payload (`#state-json`), local patch testing, and failure injection (`schema`, `request`, `slow`). All failure cases recover cleanly via `#retry` without losing session state.

---

## Verification & Test Suite

Run the full automated test suite locally:

```sh
# 1. Run typecheck, static safety linter, and 38 unit contract tests
npm run check

# 2. Run Playwright end-to-end browser tests
npm run test:ui

# 3. Run the Builder tools protocol stress-testing script
node scripts/test-builder-protocol-limits.mjs

# 4. Generate the submission zip archive
npm run package
```

### Test Results
- **Unit & Contract Suite**: 38 / 38 passed (2.80s)
- **Playwright UI Suite**: 8 / 8 passed (34.0s)
- **Builder Protocol Stress Tests**: 10 / 10 passed
- **Static Safety Linter**: 0 violations
- **Credential & Secret Exposure**: 0 leaks
- **Submission Archive**: Generated at `output/workout-source.zip` (9.26 MB) with matching SHA-256 digest in `output/SHA256.txt`

---

## Repository Structure

```
workout-starter/
├── docs/
│   ├── EXERCISE.md          # Original assignment instructions
│   ├── HARNESS.md           # Architecture of the OpenUI protocol
│   ├── RUNTIMES.md          # Provider isolation and CLI runtime guidelines
│   └── SUBMISSION.md        # Comprehensive submission and architectural report
├── skills/
│   └── workout.md           # Workout interaction instructions and component catalogue
├── src/
│   ├── server/              # Local HTTP transport, prompt assembler, mock provider
│   ├── shared/              # OpenUI AST parser, validation rules, contract types
│   └── web/                 # Browser presentation, components, dual-theme styles
├── runs/                    # Recorded session runs and protocol audit logs
├── scripts/                 # Build, package, lint, and verification scripts
└── tests/                   # Contract tests and Playwright browser integration tests
```
