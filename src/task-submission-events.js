// Only in-process submissions can attach these hooks; Discord payloads cannot.
export const TASK_SUBMISSION = Symbol('taskSubmission');

export function promptRequesterId(message) {
  return message?.[TASK_SUBMISSION]?.userId || message?.author?.id || null;
}

export function taskSubmissionEvent(message, state, details = {}) {
  message?.[TASK_SUBMISSION]?.update(state, details);
}
