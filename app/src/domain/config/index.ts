/**
 * Organization configuration — public surface for other modules.
 *
 * An adopting organization instantiates a profile; it does not fork the app.
 * Nothing here is wired into the interface: `App.tsx` is owned elsewhere and
 * does the wiring.
 */

export type {
  AdjacencyTable,
  AreaList,
  BoundaryReference,
  IsoDate,
  LoadedHourlyRate,
  OrganizationProfile,
  PlanningHorizon,
  ProfileArea,
  ProfileBudget,
  ProfileCostAssumptions,
  ProfileGeography,
  ProfileIssue,
  ProfileLanguageBoundaries,
  ProfileObservations,
  ProfileOperations,
  ProfileOrganization,
  ProfileStatus,
  ProfileValidation,
  Provenance,
  RateAssumption,
  ResolutionStatus,
  ShiftShape,
} from "./types.ts";

export {
  BASELINE_PROHIBITED_CLAIM_TYPES,
  DEFAULT_FLOOR_DOMINANCE_THRESHOLD,
  OrganizationProfileError,
  PROFILE_SCHEMA_VERSION,
  inScopeAreas,
  loadOrganizationProfile,
  parseOrganizationProfile,
  unresolvedGeographyComponents,
  validateOrganizationProfile,
} from "./profile.ts";
