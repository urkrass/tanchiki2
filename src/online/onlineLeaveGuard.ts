export const ONLINE_LEAVE_CONFIRMATION_MS = 2500

export interface OnlineLeaveRequest {
  shouldLeave: boolean
  confirmationUntil: number
}

export function requestOnlineLeave(
  currentConfirmationUntil: number,
  now: number,
  confirmationMs = ONLINE_LEAVE_CONFIRMATION_MS,
): OnlineLeaveRequest {
  if (isOnlineLeaveConfirmationActive(currentConfirmationUntil, now)) {
    return { shouldLeave: true, confirmationUntil: 0 }
  }

  return {
    shouldLeave: false,
    confirmationUntil: now + confirmationMs,
  }
}

export function getOnlineLeaveConfirmation(
  confirmationUntil: number,
  now: number,
) {
  const remainingMs = Math.max(0, confirmationUntil - now)
  return {
    active: remainingMs > 0,
    remainingMs: Math.ceil(remainingMs),
  }
}

export function isOnlineLeaveConfirmationActive(confirmationUntil: number, now: number) {
  return confirmationUntil > now
}
