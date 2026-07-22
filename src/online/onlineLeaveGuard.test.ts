import { describe, expect, it } from 'vitest'
import {
  ONLINE_LEAVE_CONFIRMATION_MS,
  getOnlineLeaveConfirmation,
  requestOnlineLeave,
} from './onlineLeaveGuard.ts'

describe('online live-match leave guard', () => {
  it('arms the first Back request instead of leaving', () => {
    const request = requestOnlineLeave(0, 1000)

    expect(request).toEqual({
      shouldLeave: false,
      confirmationUntil: 1000 + ONLINE_LEAVE_CONFIRMATION_MS,
    })
    expect(getOnlineLeaveConfirmation(request.confirmationUntil, 1100)).toEqual({
      active: true,
      remainingMs: ONLINE_LEAVE_CONFIRMATION_MS - 100,
    })
  })

  it('allows a deliberate second Back request inside the confirmation window', () => {
    const request = requestOnlineLeave(3500, 2000)

    expect(request).toEqual({ shouldLeave: true, confirmationUntil: 0 })
  })

  it('requires a fresh confirmation after the window expires', () => {
    const request = requestOnlineLeave(3500, 3500)

    expect(request).toEqual({
      shouldLeave: false,
      confirmationUntil: 3500 + ONLINE_LEAVE_CONFIRMATION_MS,
    })
    expect(getOnlineLeaveConfirmation(3500, 3500)).toEqual({ active: false, remainingMs: 0 })
  })
})
