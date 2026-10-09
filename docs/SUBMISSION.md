# AiRA Fitness · Submission Overview & Architecture Report

This document provides the assignment explanation required by [docs/EXERCISE.md](EXERCISE.md), detailing what was built, the architectural design, and the runtime modes tested.

---

## 1. What Was Built

The starter harness has been transformed into **AiRA Fitness**, a complete, multimodal AI-guided athletic performance studio:

### A. Dual Mood Mode Architecture (Cool vs. Calm)
- **Cool Mode (Default HUD)**: High-contrast cyberpunk athletic HUD with neon cyan/orange data reticles, glowing status rings, and tabular monospace telemetry for intense training focus.
- **Calm Mode (Luxury Athletic)**: Warm, editorial athletic aesthetic with soft terracotta ember accents, clean modern sans-serif typography, and subtle ambient shadows for mindful, restorative sessions.
- **Instant Toggle & State Persistence**: Toggle in the top navigation bar with persistent `localStorage` (`aira_mood_mode`) memory. Both modes share identical DOM semantics, 0 layout shifts, and pixel-matched container sizing (32px in Cool, 36px in Calm).

### B. Choose Workout Style Protocol Deck & Customizer
- **Three Core Disciplines**:
  1. *Metabolic HIIT* (15m, Zone 4 Burn, high-cadence intervals).
  2. *Compound Strength* (20m, Hypertrophy RPE 8, progressive overload).
  3. *Mobility & Core* (12m, Joint Restoration, diaphragmatic pacing).
- **Interactive Customizer**: Clicking the Edit icon allows athletes to calibrate duration presets and intensity targets on demand.

### C. Active Workout Stage, Variation Tracker & Automated Transitions
- **Central Dynamic Stage**: Displays exercise cards, rep and tempo targets (`3s Down · 1s Up`), and real-time biometric pacing rings.
- **Today's Split Variations Tracker**: Multi-station progress bar displaying completed, active, and upcoming movements with direct station navigation.
- **Hands-Free Automated Transitions**: When a set or exercise timer completes, the stage automatically advances to the next variation or rest interval, eliminating friction while athlete hands are busy.
- **Diaphragmatic Box-Breathing Pacer**: Rest intervals feature a CSS keyframe visual breathing pacer (`Inhale 4s · Hold 4s · Exhale 4s · Hold 4s`) with zero prohibited audio APIs.

### D. Coach LIVE Training & Dynamic Voice Cues
- **Synchronized Voice Cues**: Displays context-aware tactical prompts matched to current exercise cadence (eccentric descent, explosive drive, breathing rhythm).
- **Audio Notice Pill**: Muted, understated secondary tag previewing upcoming voice models with zero audio API violations.

### E. Chat With Coach AiRA: Interactive Calibration & Capabilities Grid
- **Multi-Turn MCQ Calibration**: Interactive chips (`[A]`, `[B]`, `[C]`) embedded directly in chat messages for one-touch adjustment of training objective, movement focus, and joint limitations.
- **Biomechanical Regressions**: Automatically substitutes heavy goblet squats with bodyweight box squats when knee sensitivity is indicated.
- **Capabilities Matrix**: Focuses on core AI capabilities (Adaptive Biomechanics, Dynamic Live Training, One-Touch Calibration, Biometric Split Logs).

### F. Real-Time Biometric Telemetry
- **Active Session Burn**: Implements the Compendium of Physical Activities Metabolic Equivalent of Task (MET) formula dynamically weighted by athlete body weight ($W = 78\text{ kg}$):
  $$\text{Burn Rate (kcal/min)} = \frac{\text{MET} \times 3.5 \times W}{200}$$
- **Intensity Target**: 5-zone cardiovascular reserve tracker with real-time zone highlighting.
- **Session Progress**: Pacing ring with active block indicator and duration counter.

### G. Athlete Bio & Health Diagnostics Modal
- Captures height, weight, BMI, body fat %, muscle %, preferred split, and joint restrictions with immediate `localStorage` (`aira_profile`) persistence and Coach AiRA chat synchronization.

---

## 2. Runtime Modes Tested

1. **Mock Runtime (Default & Evaluated Mode)**:
   - Primary test matrix execution target.
   - Guarded by `#mode` asserting `MOCK · NO MODEL CALLS`.
   - Verified across full 3-question intake calibration, stepper transitions, timer execution, regression patching, and export data.
2. **Subprocess / CLI Isolation Modes (OpenAIAPI & ClaudeCLI)**:
   - Verified safe environment scrubbing (strips API tokens, credentials, and runtime injection).
   - Validated timeout and abort signal handling.
   - Confirmed unconsented or disabled providers fail closed.

---

## 3. Builder Tools & Protocol Limit Testing

Stress-tested via `scripts/test-builder-protocol-limits.mjs`:
- **Protocol State Inspection**: `#state-json` accurately reflects live OpenUI AST, client events, and active timers.
- **Local Patch Reactivity**: Accepted valid patches; gracefully rejected invalid AST; sanitized XSS/HTML injections into inert text with 0 DOM node exploits.
- **Fault Resilience & Recovery**: Verified schema faults (`#fault = 'schema'`) and transport faults (`#fault = 'request'`) render actionable error banners without crashing, preserving existing screen state and recovering cleanly on `#retry`.
- **Interruption Handling**: Interrupted slow requests (`#fault = 'slow'`) mid-flight with zero race conditions.
- **Evidence Export**: Verified `runs/builder-stress-test-evidence.json` format (`aira-workout-run-v1`) with zero credential leakage.

---

## 4. Verification & Quality Metrics

| Metric | Target | Result | Status |
| :--- | :--- | :--- | :--- |
| **Unit & Contract Suite** | 38 Tests | 38 / 38 Passed (2.79s) | 100% Pass |
| **Browser Playwright Suite** | 8 Tests | 8 / 8 Passed (34.0s) | 100% Pass |
| **Builder Protocol Tests** | 10 Steps | 10 / 10 Passed | 100% Pass |
| **Static Safety Linter** | 0 Violations | 0 Violations | Passed |
| **Banned APIs (`eval`, `innerHTML`, `new Audio`)** | 0 Allowed | 0 Found | Verified |
| **Credential / Token Exposure** | 0 Leaks | 0 Leaks | Clean |
| **Mobile Responsiveness ($390\text{px}$)** | Fits Viewport | `scrollWidth <= innerWidth` | Verified |
| **Submission Package** | Standalone ZIP | `output/workout-source.zip` (9.26 MB) | Packaged |
| **SHA256 Digest** | Deterministic | Verified in `output/SHA256.txt` | Verified |
