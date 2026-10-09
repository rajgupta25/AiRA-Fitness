// Adapted from selected AiRA code; see docs/HARNESS.md.
import type { TimerStatus } from "./timer-store.js";

/**
 * WHAT THE READER DID, in the words the model will read.
 *
 * Plain English on purpose: these lines are model context, not a machine-parsed
 * event object, and they go up on the next turn's `client_events`. Kept in one
 * place because the phrasing is a small client/backend contract — she is asked to
 * reason about "Now on step 3 of 6 — Rest timer", so the sentence has to mean
 * the same thing every time it is written.
 */

/** A duration as it should appear in the event trail. */
export const durationPhrase = (seconds: number): string => {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  const plural = (n: number, unit: string): string => {
    return `${String(n)} ${unit}${n === 1 ? "" : "s"}`;
  };
  if (minutes === 0) {
    return plural(rest, "second");
  }
  if (rest === 0) {
    return plural(minutes, "minute");
  }
  return `${plural(minutes, "minute")} ${plural(rest, "second")}`;
};

export const activityClientEvents = {
  nowOnStep: (step: string): string => {
    return `Now on ${step}.`;
  },
  completedStep: (step: string): string => {
    return `Completed ${step}.`;
  },
  wentBack: (from: string, to: string): string => {
    return `Went back from ${from} to ${to}.`;
  },

  startedTimer: (label: string, seconds: number): string => {
    return `Started a timer for ${label} — ${durationPhrase(seconds)}.`;
  },
  pausedTimer: (label: string, remaining: number): string => {
    return `Paused the timer for ${label} with ${durationPhrase(remaining)} remaining.`;
  },
  resumedTimer: (label: string, remaining: number): string => {
    return `Resumed the timer for ${label} with ${durationPhrase(remaining)} remaining.`;
  },
  resetTimer: (label: string, seconds: number): string => {
    return `Reset the timer for ${label} to ${durationPhrase(seconds)}.`;
  },
  restartedTimer: (label: string, seconds: number): string => {
    return `Restarted the timer for ${label} — ${durationPhrase(seconds)}.`;
  },
  finishedTimer: (label: string): string => {
    return `The timer for ${label} finished.`;
  },
  stoppedTimer: (label: string): string => {
    return `Stopped the timer for ${label} before it finished.`;
  },


};

export interface ClientTimerSnapshot {
  label: string;
  seconds: number;
  remaining: number;
  status: TimerStatus;
}

/** The one event produced by a timer's state transition, if any. */
export const timerTransitionEvent = (
  previous: ClientTimerSnapshot | undefined,
  current: ClientTimerSnapshot,
): string | null => {
  if (!previous) {
    return activityClientEvents.startedTimer(current.label, current.seconds);
  }
  if (previous.status === "done" && current.status === "running") {
    return activityClientEvents.restartedTimer(current.label, current.seconds);
  }
  if (previous.status === "running" && current.status === "paused") {
    return activityClientEvents.pausedTimer(current.label, current.remaining);
  }
  if (previous.status === "paused" && current.status === "running") {
    return activityClientEvents.resumedTimer(current.label, current.remaining);
  }
  if (previous.status !== "done" && current.status === "done") {
    return activityClientEvents.finishedTimer(current.label);
  }
  return null;
};

/** Removing a live or paused timer is Stop; removing an acknowledged one is
 *  quiet. */
export const timerRemovedEvent = (
  previous: ClientTimerSnapshot,
): string | null => {
  return previous.status === "done"
    ? null
    : activityClientEvents.stoppedTimer(previous.label);
};
