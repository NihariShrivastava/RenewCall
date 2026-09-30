import { toISODateString } from "./utils";

export interface SkipResult {
  nextSkipCount: number;
  nextCallDate: string; // YYYY-MM-DD
  isOverdue: boolean;
  notes: string;
}

/**
 * Calculates initial call date when a lead is assigned.
 * Rule: 1 month before policy_date. If that date is already in the past, use today.
 */
export function calculateInitialCallDate(policyDateStr: string, referenceToday?: Date | string): string {
  const today = referenceToday ? new Date(referenceToday) : new Date();
  today.setHours(0, 0, 0, 0);

  const policyDate = new Date(policyDateStr);
  policyDate.setHours(0, 0, 0, 0);

  // 1 month before policy_date
  const oneMonthPrior = new Date(policyDate);
  oneMonthPrior.setMonth(oneMonthPrior.getMonth() - 1);

  // If 1 month prior is in the past or today, due today
  if (oneMonthPrior.getTime() <= today.getTime()) {
    return toISODateString(today);
  }

  return toISODateString(oneMonthPrior);
}

/**
 * Core skip schedule calculation:
 * Skip #1 -> today + 15 days
 * Skip #2 -> today + 10 days
 * Skip #3 -> today + 5 days
 * Skip #4 -> policy_date (the policy date itself)
 * 
 * Rules:
 * - If calculated date > policy_date, cap at policy_date
 * - If skipped on or after policy_date, stays in roster every day marked OVERDUE (next_call_date = today)
 */
export function calculateNextSkipDate(
  currentSkipCount: number,
  policyDateStr: string,
  referenceToday?: Date | string
): SkipResult {
  const today = referenceToday ? new Date(referenceToday) : new Date();
  today.setHours(0, 0, 0, 0);

  const policyDate = new Date(policyDateStr);
  policyDate.setHours(0, 0, 0, 0);

  const nextSkipCount = (currentSkipCount || 0) + 1;
  const isAlreadyPastPolicy = today.getTime() >= policyDate.getTime();

  // If already on or past policy date, stays in roster every day marked OVERDUE
  if (isAlreadyPastPolicy) {
    return {
      nextSkipCount,
      nextCallDate: toISODateString(today),
      isOverdue: true,
      notes: "Policy date reached or exceeded. Overdue daily follow-up.",
    };
  }

  let targetDate = new Date(today);

  switch (nextSkipCount) {
    case 1:
      // Skip #1 -> today + 15 days
      targetDate.setDate(today.getDate() + 15);
      break;
    case 2:
      // Skip #2 -> today + 10 days
      targetDate.setDate(today.getDate() + 10);
      break;
    case 3:
      // Skip #3 -> today + 5 days
      targetDate.setDate(today.getDate() + 5);
      break;
    case 4:
    default:
      // Skip #4 or higher -> policy_date
      targetDate = new Date(policyDate);
      break;
  }

  // Cap rule: If target date is later than policy_date, cap it at policy_date
  if (targetDate.getTime() > policyDate.getTime()) {
    targetDate = new Date(policyDate);
  }

  const isOverdue = targetDate.getTime() <= today.getTime() && today.getTime() >= policyDate.getTime();

  return {
    nextSkipCount,
    nextCallDate: toISODateString(targetDate),
    isOverdue,
    notes: `Scheduled next call for ${toISODateString(targetDate)} (Skip #${nextSkipCount})`,
  };
}

/**
 * Checks whether a lead should be shown in today's telecaller roster
 * Rule: status === 'pending' AND next_call_date <= today
 */
export function isLeadDueForCalling(
  status: string,
  nextCallDate: string | null | undefined,
  referenceToday?: Date | string
): boolean {
  if (status !== 'pending' || !nextCallDate) return false;

  const todayStr = toISODateString(referenceToday ? new Date(referenceToday) : new Date());
  return nextCallDate <= todayStr;
}

/**
 * Checks if a lead has reached or exceeded its policy expiry date
 */
export function isPolicyOverdue(policyDateStr: string, referenceToday?: Date | string): boolean {
  if (!policyDateStr) return false;
  const todayStr = toISODateString(referenceToday ? new Date(referenceToday) : new Date());
  return policyDateStr <= todayStr;
}
