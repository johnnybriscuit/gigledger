/**
 * Canonical plan configuration.
 * This module exists as the stable import path for runtime plan helpers.
 */

import {
  PLAN_DEFINITIONS,
  PLAN_NAMES,
  canPlanExport,
  getPlanDefinition,
  isPaidPlan,
  normalizePlan,
  type PlanDefinition,
  type UserPlan,
} from '../constants/plans';

export { PLAN_DEFINITIONS, PLAN_NAMES, normalizePlan, type PlanDefinition, type UserPlan };
export { getPlanDefinition } from '../constants/plans';

export function isPro(plan: UserPlan | null | undefined): boolean {
  return isPaidPlan(plan);
}

export function canExport(plan: UserPlan | null | undefined): boolean {
  return canPlanExport(plan);
}

export function getGigLimit(plan: UserPlan | null | undefined): number {
  return getPlanDefinition(plan).usage.gigs.limit ?? Infinity;
}

export function getPlan(plan: UserPlan | null | undefined): PlanDefinition {
  return getPlanDefinition(plan);
}
