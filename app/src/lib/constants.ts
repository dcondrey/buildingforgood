/**
 * The one number that is not a deployment's to choose.
 *
 * The coverage floor and the budget default used to live here; both now come
 * from the organization profile (`features/shell/deployment.ts`), because a
 * second organization runs this tool by writing a profile, not by editing a
 * constant. What remains is the absolute ceiling every profile's budget and
 * every hand-typed share link is validated against — a bound on what the
 * interface will accept at all, not a policy any operator sets.
 */
export const MAX_BUDGET_HOURS = 400;
