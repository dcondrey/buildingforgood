/**
 * The English catalogue: every string this product can put on a screen, in
 * an export, or in an aria-label.
 *
 * Two properties this file has to keep:
 *
 * 1. **A message is whole.** Each value is a complete sentence or a complete
 *    label, with `{named}` placeholders where a number or a name goes.
 *    Nothing here is a fragment another fragment is glued to.
 * 2. **This is the key set.** `MessageKey` is `keyof typeof EN_MESSAGES`, and
 *    every other catalogue is typed `Record<MessageKey, string>`, so a key
 *    added here without a translation is a compile error rather than a word
 *    of English in the middle of a Spanish screen.
 */

export const EN_MESSAGES = {
  /* ---- shell chrome ---------------------------------------------- */
  "app.skipToDecision": "Skip to decision",
  "topbar.tagline": "Outreach continuity planner",
  "topbar.decisionHorizon": "Decision horizon",
  "topbar.availableCapacity": "Available capacity",
  "topbar.availableStaffHours": "Available staff-hours",
  "topbar.hours": "hours",
  "topbar.budgetHelp":
    "Enter a whole number from {min} to {max}. This is a demonstration scenario, not staffing capacity data.",
  "topbar.view": "View",
  "topbar.viewStory": "Story",
  "topbar.viewWorkspace": "Map workspace",
  "topbar.guide": "Guide demo",
  "topbar.exitProjector": "Exit projector",
  "topbar.projectorMode": "Projector mode",
  "topbar.dataAndLimits": "Data & limits",
  "topbar.language": "Language",
  "footer.tagline": "See beyond the count. Plan the next shift.",
  "footer.principles": "Aggregate places. Explicit uncertainty. Human decisions.",

  /* ---- artifact currency ------------------------------------------ */
  "currency.unknownBadge": "Currency unknown",
  "currency.unknownBadgeNote": "this artifact states no currency",
  "currency.currentThrough": "Data through {month}",
  /**
   * The one phrase every currency status string must carry, in this locale.
   *
   * `currency.status` is computed from elapsed months against the threshold
   * the artifact itself states (`staleness.threshold.months`), and from
   * nothing else. It said "publication on cadence" / "publication overdue",
   * which are claims about the publisher — and the same artifact carries
   * `source_publication_scheduled: false` and a note saying DSDP announces
   * no publication dates. Registered here so `i18n.test.tsx` can require
   * every status string in every locale to name the threshold instead.
   */
  "currency.thresholdPhrase": "freshness threshold",
  "currency.overdue": "past the freshness threshold",
  "currency.onCadence": "within the freshness threshold",
  "currency.eyebrow": "Artifact currency",
  "currency.chipNone": "No currency stated",
  "currency.chipOverdue": "Past the freshness threshold",
  "currency.chipCurrent": "Within the freshness threshold",
  "currency.noBlock":
    "This artifact carries no currency block, so this build cannot say how far behind the calendar it is. The offline snapshot compiled into the bundle is always in this state. Run the monthly refresh to produce an artifact that states its own age.",
  "currency.nextRefresh": "Next refresh expected {month} on {basis}.",
  /**
   * What a program director looks at a late badge and needs to know. The
   * runbook says it too, but the person reading a stale badge is on this page,
   * not in the runbook. The last sentence is a claim with a guard behind it:
   * `refresh.py` raises if any monitoring row is marked model-eligible.
   */
  "currency.whileLate":
    "<b>What to do meanwhile.</b> Keep planning from this window. It is the newest data that met the standard, and a plan built on it is not made worse by the publisher being late. Run the monthly refresh again next month — it picks up a new report the day one is published. Do not relax the eligibility rule to make this page look current: the refresh command refuses that, on purpose.",
  "currency.frozen":
    "<b>The January 2026 replay stays frozen, permanently.</b> It is the methods exhibit — the one month this project grades itself on, using only data that existed before it. A newer artifact never replaces it, and nothing below is allowed to regrade it.",
  "currency.excludedEyebrow": "Observed · not model-eligible",
  "currency.guard":
    "These are excluded observations. They are not a forecast, not a correction, and not newer data that supersedes the replay above. The values are multiplier-adjusted person-equivalents from a publisher whose cadence broke. No row here trains a model, selects a model, or moves a staff-hour.",
  "currency.groundsLead": "Why they are excluded:",
  "currency.promotionRuleLabel": "Promotion rule.",
  "currency.viewRows": "View the {count} excluded rows",
  "currency.tableCaption":
    "Observed and excluded from {uses}. Values are {unit}, not counts of people.",
  "currency.thMonth": "Month",
  "currency.thArea": "Area",
  "currency.thSeries": "Series",
  "currency.thValue": "Value",
  "currency.thReportedAs": "Reported as",
  "currency.thModelInput": "Model input",
  "currency.excludedCell": "Excluded",
  "currency.sourceNote":
    "Transcription, provenance, and the update protocol are recorded in <c>{file}</c>.",

  /* ---- data & limits drawer --------------------------------------- */
  "disclosure.aria": "Data and limitation disclosures",
  "disclosure.eyebrow": "Local artifact",
  "disclosure.title": "Traceable by design",
  "disclosure.source": "Source",
  "disclosure.currency": "Currency",
  "disclosure.currencyOverdue":
    "Source data through {month}; past the freshness threshold this artifact states.",
  "disclosure.currencyOnCadence":
    "Source data through {month}; within the freshness threshold this artifact states.",
  "disclosure.currencyNone":
    "This artifact states no currency. Freshness is unknown and is not inferred.",
  "disclosure.coverageThrough": "Coverage through",
  "disclosure.loadedFrom": "Loaded from",
  "disclosure.organizationProfile": "Organization profile",
  "disclosure.organizationProfileValue":
    "{organization} · <c>{profileId}</c>. Owned by the {role}.",
  "disclosure.operatingParameters": "Operating parameters",
  "disclosure.operatingParametersValue":
    "{areaCount} {areaNounPlural} in scope; {budget}-staff-hour default budget over the {horizonLabel} ({horizonDays} days); {floor}h coverage floor; {reserve}h continuity reserve; {increment}-hour allocation increments; {teams} teams on {shift}-hour shifts. Every one of these is a profile value, not a constant in this build.",
  "disclosure.privacy": "Privacy",
  "disclosure.privacyValue":
    "No block records or block-level geometry; the map draws schematic outlines, not surveyed boundaries. Small per-area component cells are omitted.",
  "disclosure.aiUse": "AI use",
  "disclosure.aiUseValue":
    "Development assistance only; no AI runs in the product or determines evidence, forecasts, or allocations.",
  "disclosure.nonGoal": "Non-goal",
  "disclosure.nonGoalValue": "No tracking, enforcement, eligibility, or automatic dispatch.",
  "disclosure.pendingRequests": "Pending requests",
  "disclosure.pendingRequestsValue":
    "Data requests are pending with the San Diego Housing Commission, the Regional Task Force on Homelessness, the City's Homelessness Strategies & Solutions department, and DSDP Clean & Safe. Responsive records enter the source ledger's documented lanes before any analytical use.",
  "disclosure.close": "Close data and limits",

  /* ---- a shared link this build refused --------------------------- */
  "share.refusalAria": "Shared link",
  "share.refusalEyebrow": "Shared link",
  "share.refusalGeography":
    "This link was built against a different list of areas ({detail}). Hours and area names do not carry across geographies, so it was not applied. You are looking at the default plan for this deployment, not the sender's.",
  "share.refusalUnreadable":
    "This link could not be read ({field}: {detail}). You are looking at the default plan, not the sender's. Ask them to send the link again, unwrapped and unshortened.",

  /* ---- why a shared link was refused, translated where it is shown ------------ */
  "shareError.wholeNumberMax": "must be a whole number from 0 to {max}",
  "shareError.areaId": "must be an area id",
  "shareError.areaIdLength": "must be 1 to {max} characters",
  "shareError.areaIdLowercase": "must be a lowercase area id such as east_village",
  "shareError.reportVolume":
    "reads as report volume, which measures who reports rather than who is present; a shared link carries no such field, and no planning load may be derived from one",
  "shareError.personOrPoint":
    "reads as a person-level or point-location field; a link carries area identifiers and hours only",
  "shareError.object": "must be an object",
  "shareError.notAllowlisted":
    "is not on the shareable allowlist; a link carries budget, floor, guard, locks, and the two stated assumptions only",
  "shareError.boolean": "must be true or false",
  "shareError.list": "must be a list",
  "shareError.tooManyLocks": "must hold at most {max} areas",
  "shareError.lockPair": "must be an area id and a whole hour count",
  "shareError.repeatsArea": "repeats an area",
  "shareError.fraction": "must be a fraction from 0 to 1",
  "shareError.numberMax": "must be a number from 0 to {max}",
  "shareError.geographyIdentifier": "must be a versioned area-list identifier",
  "shareError.geographyMismatch": "names area list {theirs}; this deployment plans against {ours}",
  "shareError.notShareable": "is not a shareable parameter",
  "shareError.needsEscaping": "would need escaping, so it is not a shareable value",
  "shareError.repeated": "appears more than once",
  "shareError.missing": "is missing from the link",
  "shareError.wholeNumber": "must be a whole number",
  "shareError.version": "is version {version}; this build reads version 1 links",
  "shareError.onOrOff": "must be on or off",
  "shareError.lockPairs": "must read as area_id:hours pairs",
  "shareError.percent": "must be a percentage from 0 to 100",
  "shareError.number": "must be a number",

  /* ---- hero -------------------------------------------------------- */
  "hero.verifying": "Verifying local artifacts…",
  "hero.generated": "Generated analysis loaded",
  "hero.offline": "Offline demo snapshot",
  "hero.kicker": "Prepared decision · {focusArea} · {period}",
  "hero.title": "Fewer tents,<br><i>or fewer people?</i>",
  /**
   * The one phrase the lede must carry, in this locale.
   *
   * The evidence layer is not profile-scoped and is not going to be: it is
   * built from one pinned Downtown San Diego Partnership report on one fixed
   * path, and switching organization profiles changes the plan and nothing
   * above it (`docs/project/DECISIONS.md`, 2026-08-23). The lede used to open
   * with the 22% figure and no frame, so under any profile it read as a
   * statement about the deployment the reader had just loaded. It is a
   * statement about San Diego. Registered here so `i18n.test.tsx` can require
   * every locale's lede to say so, and to say so before the first figure.
   */
  "hero.exhibitPhrase": "San Diego’s methods exhibit, shown under every profile",
  "hero.lede":
    "The evidence on this page is San Diego’s methods exhibit, shown under every profile: it does not change when another organization’s geography is loaded — only the plan below does. On the fixed 261-block panel, Downtown San Diego’s component-derived unsheltered estimate fell 22% in a year, but the drop came from tents, not people: direct observations of people rose and appeared on 25 more blocks than the year before. This tool shows what changed, what’s uncertain, and where the next outreach shift should go.",
  "hero.compositionAria": "Observed composition and active-block footprint comparison",
  "hero.peopleSeen": "People seen in the field",
  "hero.tents": "Tents & structures",
  "hero.vehicles": "Vehicles",
  "hero.blocksWherePeopleSeen": "Blocks where people were seen",
  "hero.activeBlocks": "Active blocks",
  "hero.samePanel": "Same month · same method · same {panel} blocks",
  "hero.decisionAria": "Prepared scenario summary",
  "hero.decisionEyebrow": "The decision at hand",
  "hero.decisionQuestion":
    "Suppose <b>{hours} staff-hours</b> are available for next week’s outreach shifts. Which neighborhoods should get them?",
  "hero.capacityNote":
    "The hours are an editable assumption, not staffing data. A real deployment would use the provider’s own schedule.",
  "hero.prepared": "✓ Prepared",
  "hero.provisional": "◇ Provisional",
  "hero.travels": "Evidence limits and review triggers travel with the result.",
  "nav.aria": "Decision steps",
  "nav.testTheDrop": "Test the drop",
  "nav.checkTheForecast": "Check the forecast",
  "nav.planTheShift": "Plan the shift",
  "nav.humanReview": "Human review",

  /* ---- evidence chain --------------------------------------------- */
  "chain.aria": "Evidence and decision chain",
  "chain.verifiedSource": "Verified source",
  "chain.comparablePanel": "Comparable panel",
  "chain.comparablePanelDetail": "{panel} fixed blocks · same method",
  "chain.auditedScenario": "Audited scenario",
  "chain.auditedScenarioDetail": "{folds} held-out folds · {coverage}% coverage",
  "chain.humanReview": "Human review",
  "chain.humanReviewDetail": "Coordinator decides",

  /* ---- section 01 · test the drop --------------------------------- */
  "drop.eyebrow": "What actually changed",
  "drop.title": "Test the drop",
  "drop.intro":
    "The falling estimate is built from three things counted in the field: people, tents, and vehicles. Compare each on the same {panel} blocks, one January to the next, and see which actually dropped.",
  "drop.metricPeople": "People seen in the field",
  "drop.metricTents": "Tents & structures",
  "drop.metricVehicles": "Vehicles",
  "drop.metricBlocksOnePerson": "Blocks with at least one person",
  "drop.metricActiveFootprint": "Active footprint",
  "drop.blocksLikeForLike": "+{blocks} blocks · like-for-like",
  "drop.activeBlocksPct": "+{pct}% active blocks",
  "drop.howToRead": "How to read this comparison",
  "drop.howToReadSub": "Panel, units, and date checks",
  "drop.mixedIndexNote":
    "<b>Secondary mixed-component context:</b> all active blocks {activeFrom} → {activeTo} (+{activePct}%); mixed-unit index {fromValue} → {toValue} ({changePct}%). The index arithmetically sums unlike observation units—individuals, structures, and vehicles—and is not a count of unique people or an estimated person total. Panel fixed at {panel} blocks.",
  "drop.comparisonDefense":
    "This is the latest available same-month year-over-year pair in the supplied panel: January 2025 is its final date, both months use the POST2020 method, and the exact same {panel} blocks are compared.",
  "drop.revealButton": "Test the drop",
  "drop.revealNote": "Same result every run · bundled local data · no AI in the loop",
  "drop.resultEyebrow": "What the same-blocks comparison shows",
  "drop.resultWithSpatial":
    "People were seen on more blocks than last year, spread about as evenly as before. Tents disappeared from many blocks and bunched up in fewer. These are on-site observations: they cannot say who moved where, or why.",
  "drop.resultWithoutSpatial":
    "Field activity reached more blocks while becoming more concentrated where it remained. These are on-site observations: they cannot say who moved where, or why.",
  "classification.widerFootprintPeople": "People were seen in more places, not fewer",
  "classification.widerFootprintActivity": "Field activity spread across more blocks",
  "drop.humanReviewRequired": "Human review required",
  "drop.componentProofAria": "Like-for-like observed individual and tent footprint sensitivity",
  "drop.keyCheckEyebrow": "The key check · same blocks, one year apart",
  "drop.keyCheckTitle": "People were seen on more blocks, however strictly you count",
  "drop.sameBlocksBothYears": "Same 261 blocks both years",
  "drop.thresholdOnePerson": "Blocks with ≥1 person seen",
  "drop.thresholdTwoPeople": "Blocks with ≥2 people seen",
  "drop.thresholdOneTent": "Blocks with ≥1 tent",
  "drop.thresholdTwoTents": "Blocks with ≥2 tents",
  "drop.blocksDelta": "{delta} blocks",
  "drop.individualsConcentration": "Individuals: similar concentration",
  "drop.tentsConcentration": "Tents: sharper concentration",
  "drop.hhiWithEffectiveBlocks":
    "HHI {hhiFrom} → {hhiTo} · effective blocks {blocksFrom} → {blocksTo}",
  "drop.derivedEyebrow": "Why the adjusted estimate can fall",
  "drop.derivedNote": "Secondary POST2020 multiplier-derived estimate",
  "drop.individuals": "Individuals",
  "drop.structures": "Structures",
  "drop.vehicles": "Vehicles",
  "drop.derivedExplain":
    "The derived decline is structure-driven and partly offset by more observed individuals. Components were digitized from maps; this is not a unique-person count or the published total series.",
  "drop.exploreEvidence": "Explore supporting evidence",
  "drop.exploreEvidenceSub": "Thresholds, geography, limits, and review triggers",
  "drop.distributionAria":
    "Secondary mixed-unit active-block threshold and concentration sensitivity",
  "drop.secondaryEyebrow": "Secondary mixed-unit sensitivity",
  "drop.secondaryTitle": "Mixed threshold dependence and composition-driven HHI",
  "drop.notAPersonCount": "Not a person count",
  "drop.activeBlocksAtLeast.one": "Active blocks ≥{count} unit",
  "drop.activeBlocksAtLeast.other": "Active blocks ≥{count} units",
  "drop.thresholdChurn": "{delta} · {entered} entered / {exited} exited",
  "drop.intensityConcentration": "Intensity concentration",
  "drop.hhiPct": "HHI +{pct}%",
  "drop.effectiveBlocks": "effective blocks {from} → {to}",
  "drop.singleUnitNote":
    "Single-unit blocks grew {from} → {to} (+{change}), but do not alone explain the +{activeChange} at ≥1 because ≥2 still rises. HHI {hhiFrom} → {hhiTo} is composition-driven; this secondary mixed index does not establish uniform spread or track movement.",
  "drop.churnEyebrow": "Secondary mixed-unit index",
  "drop.churnTitle": "Index churn inside the stable panel",
  "drop.churnAria": "{increases} increases, {decreases} decreases, net {net}",
  "drop.grossIncreases": "Gross increases",
  "drop.grossDecreases": "Gross decreases",
  "drop.churnMethodNote":
    "Individuals, tents/structures, and vehicles each count as one raw unit here. This is not a person estimate; the footprint is fixed at {panel} blocks.",
  "drop.aggregateContext": "Aggregate context",
  "drop.whereSignalChanged": "Where the signal changed",
  "drop.activeBlocksFormula": "Active blocks +{change}",
  "drop.evidenceFor": "Evidence for",
  "drop.evidenceForText":
    "Observed individuals increased while structures fell; individual observations reached more fixed-panel blocks at both tested thresholds.",
  "drop.evidenceBoundary": "Evidence boundary",
  "drop.evidenceBoundaryText": "No identities, movement paths, or causal explanation are observed.",
  "drop.validityCheck": "Validity check",
  "drop.validityCheckText": "Stable panel, explicit missingness, source-era labels kept separate.",
  "drop.challengeEyebrow": "Adversarial checkpoint",
  "drop.challengeTitle": "What would change our mind?",
  "drop.challengeBadge": "Open to revision",
  "drop.challengeLede":
    "This result is useful because its failure conditions are explicit. Any one of these findings would downgrade the conclusion or trigger a new review.",
  "drop.challengeMonths":
    "One of the matched months is later found to be incomplete or misclassified.",
  "drop.challengeBoundary":
    "A boundary or method change makes the 261-block comparison non-comparable.",
  "drop.challengeDiscontinuity":
    "Source review explains the 2023–2024 discontinuity as collection change.",
  "drop.challengeHeldOut":
    "New held-out data materially weakens forecast error or interval coverage.",
  "drop.challengeDigitization":
    "Digitization error measured by the field-sheet audit (two readings currently disagree on {pct}% of recovered values) grows large enough to account for the downtown change being interpreted.",

  /* ---- optional attention-bias diagnostic -------------------------- */
  "bias.summaryLabel": "Optional attention-bias check",
  "bias.summaryText": "Encampment report share rose {points} points",
  "bias.excludedChip": "Excluded from planner",
  "bias.eyebrow": "Get It Done · descriptive diagnostic",
  "bias.title": "Did public reporting attention change?",
  "bias.diagnosticOnly": "Diagnostic only · no causal claim",
  "bias.matchedEyebrow": "Matched calendar · same Aug–Jan months YoY",
  "bias.matchedTitle": "Seasonality check strengthens the reporting-pattern shift",
  "bias.encampmentRows": "Encampment rows",
  "bias.topLevelRequests": "Top-level requests",
  "bias.allGidRows": "All GID rows",
  "bias.encampmentShare": "Encampment share",
  "bias.uniqueParents": "Unique parents",
  "bias.placeboBasket": "Placebo basket",
  "bias.preparedWindows": "Prepared pre/post windows · July 2023 excluded",
  "bias.checkpointsEyebrow": "Cross-source checkpoints",
  "bias.checkpointsNote": "Raw reports per published total unit—not reports per person.",
  "bias.checkpointDetail": "{raw} raw reports / {published} published units",
  "bias.duplicateShare": "Duplicate-child share {from} → {to}%",
  "bias.mobileShare": "Mobile-origin share {from} → {to}%",
  "bias.queryNote": "<c>comm_plan_name=DOWNTOWN</c> · <c>date_requested</c> · July 2023 excluded",
  "bias.neverUsedFor":
    "<b>Never used for:</b> planning load, outreach allocation, people or movement, abatement, case response, intervention effects, or the forecast.",
  "bias.unavailable":
    "<b>Optional reporting diagnostic unavailable.</b> The loaded artifact did not contain a complete validated diagnostic, so no partial values are shown. This lane remains excluded from forecasting and allocation.",
  "robust.eyebrow": "Alternative explanations tested",
  "robust.title": "Two descriptive sensitivity checks",
  "robust.footfallEyebrow": "Footfall sensitivity",
  "robust.parkingTitle": "Paid-parking proxy",
  "robust.parkingMatched": "Same six calendar months one year apart",
  "robust.parkingAligned": "Aligned six-month means · July 2023 excluded",
  "robust.verifiedPoles": "{poles} historically verified poles",
  "robust.transactionsPerMonth": "transactions / month · {pct}%",
  "robust.allDowntownMeters": "All observed Downtown meters",
  "robust.perMeterMonth": "Per meter-month",
  "robust.matchedCalendarSensitivity": "matched-calendar sensitivity",
  "robust.allObservedMeters": "all observed meters {pct}%",
  "robust.parkingCaveat":
    "Transactions ≠ people or visits. Rates, hours, inventory, payment substitution, free parking, events, transit, economy, and seasonality remain possible; the parking zone is not a proven GID-boundary match.",
  "robust.countDayEyebrow": "Count-day sensitivity",
  "robust.weatherTitle": "NOAA weather was nearly matched",
  "robust.tempF": "{value}°F",
  "robust.rainIn": "{value} in rain",
  "robust.weatherCaveat":
    "{station}. This rules out only an obvious same-day rain/TMAX contrast; airport conditions and prior weather may differ.",
  "robust.unavailable":
    "Alternative-explanation checks are unavailable in this artifact. They remain excluded from forecasting and allocation.",

  /* ---- field-sheet digitization audit ------------------------------ */
  "digit.eyebrow": "The ruler gets audited too · computer vision",
  "digit.title": "Field-sheet digitization audit",
  "digit.engineLocal": "Engine: Apple Vision · offline",
  "digit.engineVlm": "Engine: EyePop.ai VLM · hosted",
  "digit.engineOcr": "Engine: EyePop.ai OCR · hosted",
  "digit.intro":
    "The published counts are digitized by hand from scanned, hand-annotated field sheets. This audit recovers the sheets' own written totals from the pinned public June 2026 report — per page, area-scale values only; anything block-scale is counted but withheld.",
  "digit.finding":
    "<b>Recovered, misread, and caught:</b> the shipped 200-DPI pass reads the City Center sheet's handwritten total as 157 (page 4 below); the same engine re-rastered at 300 DPI reads 152, which is what the sheet shows. The sheet reconciles through the published multipliers to the published area total: 152 + 14 × 1.75 = 176.5 ≈ 177. Handwriting recognition is unstable across scan resolutions — surfacing that instability is the audit's job, and it is why recovered values are candidates for human verification, never counts.",
  "digit.perPage": "Per-page recovery across {pages} pages",
  "digit.tableCaption": "Recovered integer tokens and area-scale values (≥{threshold}) by page",
  "digit.thPage": "Page",
  "digit.thIntegerTokens": "Integer tokens",
  "digit.thAreaScaleValues": "Area-scale values",
  "digit.thWithheld": "Withheld",
  "digit.valuesTruncated": "{values} … +{more} more",
  "digit.agreementEyebrow": "Do two readings agree? · cross-check",
  "digit.agreementTitle": "Reading-vs-reading agreement",
  "digit.runLabel": "{engine} · {dpi} DPI",
  "digit.engineAppleVision": "Apple Vision",
  "digit.agreementFinding":
    "Two full readings of the same pinned report — the shipped 200-DPI pass and a 300-DPI re-raster — agree on {shared} of the {first} and {second} area-scale values they each recovered ({pct}%). The disagreements are the City Center misread above plus a handful of single-token differences. Same engine read twice is a floor on digitization instability, not an independent second opinion; the engine-vs-engine version of this card — Apple Vision against EyePop's hosted OCR or its image-contents VLM reading — is one comparison run away once a key lands.",
  "digit.agreementPerPage": "Per-page agreement across {pages} pages",
  "digit.agreementTableCaption": "Values recovered by both readings, and by only one, per page",
  "digit.thShared": "Shared",
  "digit.thOnlyFirst": "Only 200 DPI",
  "digit.thOnlySecond": "Only 300 DPI",
  "digit.auditBoundary":
    "Text recovered from an already-published aggregate count document. Page-level results only: integer-token counts and values at or above the area-total threshold. No block identifiers, no geometry, no sub-threshold values; a reference card for auditing the digitization lineage, never a model input.",
  "digit.agreementBoundary":
    "Agreement summary over two page-level, privacy-filtered digitization-audit cards. It writes only values already present in a filtered card; independent-engine agreement is evidence about the digitization lineage, never a model input.",
  "digit.swappable":
    "The OCR engine is swappable; EyePop.ai's hosted abilities are a drop-in replacement.",

  /* ---- section 02 · forecast --------------------------------------- */
  "forecast.eyebrow": "Forecast rehearsal · methods exhibit · only past data used",
  "forecast.title": "Could we have predicted January 2026?",
  "forecast.intro":
    "Using only data available in December 2025, the tool forecasts the next month, then grades itself against its own past errors. The plan uses the high end of that error range, so uncertainty buys extra coverage.",
  "forecast.rehearsalChip": "A rehearsal on past data · not a live forecast",
  "forecast.bestGuess": "best single guess",
  "forecast.likelyRange": "Likely range, from past errors",
  "forecast.usesHighEnd": "the plan uses the high end",
  "forecast.backtestEyebrow": "Rolling-origin backtest",
  "forecast.scorecardTitle": "Model scorecard",
  "forecast.baselineRetained": "Baseline retained",
  "forecast.challengerPromoted": "Challenger promoted",
  "forecast.modelRule":
    "A candidate is promoted only if it improves held-out error on the 2023 promotion window — the scorecard rows below. The audit figures above them come from the separate, untouched 2025 walk-forward, which is why the two error levels differ. Lower MAE and WAPE are better; interval coverage is audited separately.",
  "forecast.auditAria": "Final 2025 walk-forward audit",
  "forecast.auditMae": "2025 audit MAE",
  "forecast.auditWape": "2025 audit WAPE",
  "forecast.intervalCoverage": "Interval coverage",
  "forecast.heldOutFolds": "{folds} held-out folds",
  "forecast.scorecardCaption": "Rolling-origin forecast model comparison",
  "forecast.thModel": "Model",
  "forecast.thMae2023": "2023 MAE",
  "forecast.thWape2023": "2023 WAPE",
  "forecast.thCoverage": "Coverage",
  "forecast.selected": "Selected",
  "forecast.noBlackBox": "No black-box promotion.",
  "forecast.noBlackBoxDetail": "Seasonal baseline remains unless a candidate wins out of sample.",
  "forecast.viewValues": "View accessible scenario values & method",
  "forecast.tableCaption":
    "Observed history and historical one-step-ahead scenario shown in the chart",
  "forecast.thPeriod": "Period",
  "forecast.thStatus": "Status",
  "forecast.thValue": "Value",
  "forecast.thLower": "Lower",
  "forecast.thUpper": "Upper",
  "forecast.statusMissing": "Missing",
  "forecast.statusObserved": "Observed",
  "forecast.statusScenario": "Historical scenario",
  "forecast.trainingLabel": "Training:",
  "forecast.trainingNote":
    "{window}. Rolling-origin evaluation; no interpolation across missing targets. Data are frozen at December 2025; the historical scenario’s upper bound feeds only this demonstration allocation. The residual band achieved {coverage}% empirical coverage across {folds} folds; it is not a guaranteed 80% probability statement.",
  "chart.aria":
    "Historical one-step-ahead planning scenario for {period}, using data frozen December 2025: point {point}, with a {lower} to {upper} residual interval.",
  "chart.title": "Historical one-step-ahead planning scenario and residual interval",
  "chart.desc":
    "Observed monthly history with missing periods shown as gaps, followed by a historical scenario point and its residual interval.",
  "chart.pointMissing": "{period}: missing",
  "chart.pointValue": "{period}: {value}",
  "chart.scenarioLabel": "{period} scenario",
  "chart.scenarioValue": "{point} ({lower}–{upper})",
  "chart.notReported": "not reported",
  "chart.rangeLabel": "{lower}–{upper} range",
  "chart.legendObserved": "Observed",
  "chart.legendForecast": "Forecast (rehearsal)",
  "chart.legendRange": "Likely range, from past errors",

  /* ---- section 03 · the plan --------------------------------------- */
  "planner.eyebrow": "The staffing plan",
  "planner.title": "Plan {hours} staff-hours",
  "planner.intro":
    "Split the hours across {countedAreas}. First, every area gets a minimum you choose, so no place goes unvisited. Whatever remains goes where the forecast expects the most people.",
  "planner.guaranteedMinimum": "Guaranteed minimum",
  "planner.guardOn": "ON · {floor}h per area",
  "planner.guardOff": "OFF · COMPARISON ONLY",
  "planner.infeasibleTitle": "No feasible plan",
  "planner.infeasibleAdvice": "Increase the budget, remove a lock, or explicitly revise the floor.",
  "planner.mapHeading": "The plan on the map",
  "planner.mapLede":
    "Every {areaNoun} keeps its guaranteed minimum; the extra hours go where the forecast expects the most people.",
  "planner.constraintCheck": "Constraint check",
  "planner.budgetConserved": "Budget conserved exactly",
  "planner.budgetMismatch": "Budget mismatch",
  "planner.unmetPlanningLoad": "Unmet planning load",
  "planner.unmetMoved": "{hours}h moved to minimums and locks",
  "planner.unmetNone": "0h · hours follow the forecast",
  "planner.floorCostEyebrow": "Cost of the floor · assumed",
  "planner.floorCostValue": "{cost} at an assumed {rate}",
  "planner.humanChanges": "Human changes",
  "planner.lockedAssignments.one": "{count} locked assignment",
  "planner.lockedAssignments.other": "{count} locked assignments",
  "planner.noneYet": "None yet",
  "planner.recompute": "Recompute unlocked hours",

  /* ---- planner controls -------------------------------------------- */
  "controls.floorAria": "Coverage-continuity floor sensitivity",
  "controls.youSetThis": "You set this · the tool never picks it",
  "controls.floorTitle": "Guaranteed minimum hours for every {areaNoun}",
  "controls.floorHours": "{floor}h",
  "controls.floorNone": "no minimum",
  "controls.floorDefault": "default",
  "controls.floorCompare": "compare",
  "controls.policyLensLabel": "Policy lens:",
  "controls.policyLensNoFloor":
    "<b>Policy lens:</b> with no minimum, hours follow the forecast alone. Use this to see which {areaNounPlural} would be left with almost nothing; it is a comparison view, not a recommendation.",
  "controls.policyLensWithFloor":
    "<b>Policy lens:</b> {setAside} of {budget} hours are set aside first ({floor} per {areaNoun}); the rest follows the forecast.",
  "controls.whatIfLabel": "What-if · drag to stress-test the budget",
  "controls.whatIfHours": "{hours}h",
  "controls.whatIfHelp":
    "Recomputes live under the same floors and locks. Watch the map and bars; when the budget cannot cover the floors and locks, the tool says so instead of silently repairing the plan.",

  /* ---- scenario workbench ------------------------------------------ */
  "bench.eyebrow": "Scenario workbench · saved only in this browser",
  "bench.save": "Save scenario",
  "bench.empty": "Save this plan, change the policy, then compare the two side by side.",
  "bench.comparing": "Comparing",
  "bench.compare": "Compare",
  "bench.delete": "Delete scenario {name}",
  "bench.comparingWith":
    "Comparing with <b>{name}</b> — each area shows how many hours the current plan shifts against it.",
  "bench.infeasible":
    "<b>{name}</b> is infeasible against the current data, so no comparison is shown.",
  "bench.scenarioName": "{budget}h · {floor}h floor",
  "bench.scenarioNameWithLocks.one": "{budget}h · {floor}h floor · {count} lock",
  "bench.scenarioNameWithLocks.other": "{budget}h · {floor}h floor · {count} locks",

  /* ---- planner start ------------------------------------------------ */
  "start.available": "available",
  "start.guaranteedMinimums": "guaranteed minimums",
  "start.followTheForecast": "follow the forecast",
  "start.generate": "Generate coverage scenario",
  "start.budgetInvalid":
    "Enter a whole number of hours between {min} and {max} to generate a plan.",

  /* ---- plan rows ---------------------------------------------------- */
  "rows.allocated": "{allocated}/{budget} hours allocated.",
  "rows.compareNoMinimum": "Compare with no minimum",
  "rows.restoreMinimum": "Restore the {floor}h minimum",
  "rows.resetLocks": "Reset locks",
  "rows.auditBannerFloor":
    "<b>Comparison view, not a recommendation.</b> With no minimum enforced, areas below {floor}h would lose their guaranteed visit.",
  "rows.auditBannerNoFloor":
    "<b>Comparison view, not a recommendation.</b> This shows what happens with no guaranteed minimum: {someAreas} get almost nothing.",
  "rows.assumptionBanner":
    "<b>Assumption explorer: {area} modeled as cleared.</b> Under your assumption, {pct}% of its planning load ({shifted}) shifts to adjacent areas and {resolved} is assumed resolved — assumed, not observed.{churn} The counts cannot show who moves where or why, so this explores your stated assumption; it is not a prediction and does not endorse the action.",
  "rows.assumptionChurn": " The plan reallocates {hours} staff-hours in response.",
  "rows.clearAssumption": "Clear assumption",
  "rows.accuracyWarningWithAreas":
    "<b>Illustrative and human-review-only.</b> Aggregate audit WAPE is {wape}%. Area-level held-out WAPE ranges {min}%–{max}%; small areas are noisier. The aggregate score does not imply equal area accuracy; a coordinator must review every assignment.",
  "rows.accuracyWarningNoAreas":
    "<b>Illustrative and human-review-only.</b> Aggregate audit WAPE is {wape}%. Area-level held-out WAPE is unavailable in this artifact. The aggregate score does not imply equal area accuracy; a coordinator must review every assignment.",
  "rows.listAria": "Illustrative staff-hour allocation",
  "rows.planningFor": "Planning for up to {load} observations · {split}",
  "rows.splitLocked": "human lock at {hours}h",
  "rows.splitGuarded": "{floorHours}h minimum + {extraHours}h forecast share",
  "rows.splitUnguarded": "{hours}h forecast share, no minimum",
  "rows.movedAway": " · {hours}h moved away by the floor",
  "rows.hoursFor": "Hours for {area}",
  "rows.hourUnit": "h",
  "rows.lockAt": "Lock {area} at {hours} hours",
  "rows.locked": "Locked",
  "rows.lock": "Lock",
  "rows.chipNoMinimum": "No minimum",
  "rows.chipBelowMinimum": "Below minimum",
  "rows.chipMinimumMet": "{floor}h minimum met",
  "rows.deltaUp": "+{hours}h vs saved",
  "rows.deltaDown": "{hours}h vs saved",
  "rows.deltaSame": "same as saved",

  /* ---- assumption explorer ------------------------------------------ */
  "intervention.eyebrow": "Stress-test an action · assumption explorer",
  "intervention.lede":
    "What if {area} were cleared? The counts cannot show who moves where or why, so you state the assumption and the plan shows its consequences. Clearing an area adds no shelter capacity.",
  "intervention.shareLabel":
    "Assumed share of its planning load that shifts to adjacent areas instead of being resolved",
  "intervention.clear": "Clear assumption",
  "intervention.explore": "Explore this assumption",

  /* ---- cost assumption ---------------------------------------------- */
  "cost.rateAria": "Loaded hourly rate assumption",
  "cost.rateEyebrow": "You set this · an assumption, not a measured rate",
  "cost.rateLabel": "Assumed fully loaded cost of one outreach staff-hour",
  "cost.perStaffHour": "{money} per staff-hour",
  "cost.rateBasis":
    "Wages, payroll taxes, benefits, field supervision, and vehicle cost, as your organization budgets them. This project does not measure, publish, or derive this rate; the starting value is a placeholder your finance lead must replace before any figure below is shown to a decision-maker. It leaves out client assistance funds, capital, and organization-wide indirect administration. Moving this slider changes every cost figure and no plan.",
  "cost.floorSentenceNoHours":
    "The equity floor costs {money} and moved no hours away from the highest-load area ({area}).",
  "cost.floorSentenceHours":
    "The equity floor costs {money} and moved {hours} hours from the highest-load area ({area}).",
  "cost.summaryGuarded":
    "That is {hours} hours moved plan-wide by the guaranteed minimum, priced at your assumed {rate}.",
  "cost.summaryUnguarded":
    "The minimum is switched off in this comparison view, so it moves nothing and costs nothing.",
  "cost.summaryTail":
    "The whole plan of {hours} staff-hours costs {total} at that same assumed rate. The rate is an operator-set assumption, not a measured or published figure, and it enters no allocation: the same plan is produced at every rate. Costs are stated per staff-hour, per area, and per plan only — never per person, per contact, or per anyone covered.",
  "cost.tableSummary": "Cost by neighborhood, at the assumed rate",
  "cost.tableCaption":
    "Assumed cost of the planned staff-hours. Hours × the assumed rate, nothing else.",
  "cost.thNeighborhood": "Neighborhood",
  "cost.thPlannedHours": "Planned hours",
  "cost.thAssumedCost": "Assumed cost",
  "cost.wholePlan": "Whole plan",
  "cost.hoursValue": "{hours}h",

  /* ---- capacity context and the brief -------------------------------- */
  "brief.capacitySummary": "Capacity context: staff-hours in staffing terms",
  "brief.capacityWeeks":
    "The assumed {hours}-hour budget equals {weeks} forty-hour staff-weeks. The budget, and the forty-hour week used to restate it, are stated assumptions, not staffing data.",
  "brief.capacityHud":
    "For scale only: HUD case-management guidance suggests roughly 20 to 30 clients per case manager for housing-focused navigation and 10 to 12 for intensive support (HUD, Homeless System Response: Case Management Ratios, HUD Exchange). That guidance describes community-based case management, not street outreach; no street-outreach caseload standard appears in the primary federal guidance we reviewed, and HUD publishes these ratios as planning help, not binding rules.",
  "brief.capacityLocal":
    "Locally: a City of San Diego public-records release includes a 2023-era Alpha Project shelter proposal that contracts case management at one worker per 15 single adults and one per 12.5 families. Those are proposed shelter staffing ratios, not street outreach and not observed practice (City PRA release, pinned in the source ledger).",
  "brief.capacityBoundary":
    "These benchmarks are context for a capacity conversation only. No benchmark number enters the allocation, and nothing here estimates any person's service need, eligibility, or availability.",
  "brief.portableEyebrow": "Portable output",
  "brief.portableLede":
    "Copies the allocation with source, model, constraints, caveats, and human changes attached.",
  "brief.copy": "Copy decision brief",
  "brief.copied": "Decision brief copied with assumptions and review triggers.",
  "brief.copyFailed": "Clipboard unavailable. The full brief is open below for manual copy.",
  "brief.full": "Full decision brief",

  /* ---- section 04 · review ------------------------------------------- */
  "review.eyebrow": "You decide",
  "review.title": "Review before the next shift",
  "review.intro":
    "The tool writes the plan up with its caveats attached. A coordinator decides what local context changes.",
  "review.statusReady": "Ready for coordinator review",
  "review.statusComparison": "Comparison view · restore a minimum to continue",
  "review.statusMismatch": "Budget mismatch · cannot copy",
  "review.statusDirty": "Recompute human changes",
  "review.statusWaiting": "Waiting for a feasible plan",
  "review.whatChanged": "What changed",
  "review.whatChangedValue": "Individuals +{individuals}% · structures {structures}%",
  "review.whatMayBeHidden": "What may be hidden",
  "review.activeBlocks": "Active blocks +{change}",
  "review.activeBlocksWithHhi": "Active blocks +{change} · HHI +{hhi}%",
  "review.historicalRange": "Historical Jan 2026 range",
  "review.rangeValue": "{lower}–{upper}",
  "review.illustrativeCapacity": "Illustrative capacity",
  "review.capacityValue": "{hours} staff-hours",
  "review.runPlanner": "Run planner",
  "review.coveragePolicy": "Coverage-continuity policy",
  "review.floorValue": "{floor}h demo-policy minimum",
  "review.noFloorValue": "No minimum · comparison only",
  "review.humanOverrides": "Human overrides",
  "review.none": "None",
  "review.triggersEyebrow": "Review again when",
  "review.triggerNewMonth": "New month",
  "review.triggerBudget": "Budget changes",
  "review.triggerBoundary": "Boundary changes",
  "review.triggerInterval": "Interval widens",
  "review.triggerFloor": "Floor infeasible",
  "review.triggerLocal": "Local knowledge conflicts",
  "review.neverAuthorized":
    "<b>Never authorized:</b> person tracking, causal claims, enforcement, eligibility decisions, or automatic dispatch.",
  "review.boundaryCard": "Boundary card",
  "review.modelCard": "Model card",
  "review.claimLimits": "Claim limits",
  "review.limitation": "Limitation",

  /* ---- the map and its accessible equivalents ------------------------ */
  "map.ariaHours": "Map of {countedAreas} showing planned staff-hours; select one for detail",
  "map.ariaChange":
    "Map of {countedAreas} showing the change in raw field observations; select one for detail",
  "map.ariaUnmet":
    "Map of {countedAreas} showing unmet planning load in hours; select one for detail",
  "map.areaValue": "{area}: {value}",
  "map.noData": "no data",
  "map.bay": "San Diego Bay",
  "map.freeway": "I-5",
  "map.legendAria": "Map legend",
  "map.legendMore": "More observed units",
  "map.legendFewer": "Fewer observed units",
  "map.legendMissing": "No recent observation",
  "map.captionChange":
    "Change in raw field observations by neighborhood · schematic outlines, not surveyed boundaries · aggregate values only · not a count of people",
  "map.captionPlanned":
    "Planned staff-hours by neighborhood · schematic outlines, not surveyed boundaries",
  "map.captionBelowMinimum": " · ! marks hours below the minimum",
  "map.captionAssumption": " · {area} modeled as cleared (assumption)",
  "map.hoursValue": "{hours}h",
  "map.hoursBelowFloor": "{hours}h !",
  "table.viewAsTable": "View map values as a table",
  "table.thNeighborhood": "Neighborhood",
  "table.thValue": "Value",
  "table.thState": "State",
  "table.captionChange": "Change in raw field observations by neighborhood",
  "table.captionPlanned": "Planned staff-hours by neighborhood",
  "table.captionObservedChange": "Observed change by neighborhood",
  "table.captionUnmet": "Unmet planning load by neighborhood",
  "state.noRecentObservation": "No recent observation",
  "state.moreObservedUnits": "More observed units",
  "state.fewerObservedUnits": "Fewer observed units",
  "state.humanLock": "Human lock",
  "state.noMinimum": "No minimum",
  "state.belowMinimum": "Below minimum",
  "state.minimumMet": "Minimum met",
  "state.loadMovedByMinimums": "Load moved by minimums",
  "state.followsForecast": "Follows forecast",

  /* ---- area detail panels -------------------------------------------- */
  "detail.emptyChange":
    "Select a neighborhood — click, or Tab and Enter — to see what changed there.",
  "detail.emptyPlan":
    "Select a neighborhood on the map — click, or Tab and press Enter — to inspect its share of the plan, or to stress-test an action there.",
  "detail.emptyDossier": "Select a neighborhood on the map to open its dossier.",
  "detail.kickerNeighborhood": "Neighborhood detail",
  "detail.kickerAllocation": "Allocation detail",
  "detail.kickerDossier": "Area dossier",
  "detail.noteChange":
    "Raw observed units on the fixed like-for-like panel. Aggregate area values, not unique people; components are digitized from the same maps.",
  "detail.observedChange": "Observed change",
  "detail.unitsDelta": "{delta} units",
  "detail.noRecentObservation": "no recent observation",
  "detail.hintSameBlocks": "Jan 2024 → Jan 2025, same blocks",
  "detail.hintRawSameMonth": "raw field observations, same month",
  "detail.latestObservations": "Latest observations",
  "detail.latestCount": "Latest count",
  "detail.hintMonthlyStreetCount": "most recent monthly street count",
  "detail.hintLatestMonthly": "latest monthly observation",
  "detail.planningLoad": "Planning load",
  "detail.hintUpperForecastBound": "upper forecast bound",
  "detail.hintAdjustedByAssumption": "adjusted by the active assumption",
  "detail.hintWeightsRemaining": "weights the remaining hours",
  "detail.plannedHours": "Planned hours",
  "detail.hintHumanLockEditAbove": "human lock — edit in the list above",
  "detail.hintRecomputeUpdates": "recompute updates this",
  "detail.hintHumanLock": "human lock",
  "detail.hintMinimumGuaranteed": "{floor}h minimum guaranteed",
  "detail.hintNoMinimumEnforced": "no minimum enforced",
  "detail.coverageFloor": "Coverage floor",
  "detail.floorValue": "{floor}h minimum",
  "detail.floorOff": "off — audit only",
  "detail.hintUserSetFloor": "user-set continuity floor",
  "detail.unmetLoad": "Unmet load",
  "detail.hintMovedByMinimums": "hours moved by minimums and locks",
  "detail.heldOutWape": "Held-out WAPE",
  "detail.notAudited": "not audited",
  "detail.wapeValue": "{wape}%",
  "detail.hintNoisyCaution": "noisy — treat with caution",
  "detail.hintNoisyReview": "noisy — human review required",
  "detail.hint2025Audit": "2025 held-out audit",
  "detail.vsSavedScenario": "Vs saved scenario",
  "detail.same": "same",
  "detail.deltaHours": "{delta}h",
  "detail.hintVsPinned": "current plan minus pinned scenario",

  /* ---- map workspace --------------------------------------------------- */
  "workspace.stageAria": "Plan map stage",
  "workspace.layerAria": "Map layer",
  "workspace.layerHours": "Planned hours",
  "workspace.layerChange": "Observed change",
  "workspace.layerUnmet": "Unmet load",
  "workspace.captionHours": "Planned staff-hours by neighborhood",
  "workspace.captionChange": "Change in raw field observations, latest same-month comparison",
  "workspace.captionUnmet": "Hours the minimums moved away from the forecast split",
  "workspace.captionTail": " · schematic outlines, not surveyed boundaries · not a count of people",
  "workspace.inspectorAria": "Inspector",
  "workspace.tabsAria": "Inspector sections",
  "workspace.tabPlan": "Plan",
  "workspace.tabArea": "Area",
  "workspace.tabScenarios": "Scenarios",
  "workspace.tabBrief": "Brief",

  /* ---- live plan state ------------------------------------------------- */
  "state.liveAria": "Live plan state",
  "state.allocated": "{allocated}/{budget}h allocated",
  "state.floor": "{floor}h floor",
  "state.noMinimumShort": "no minimum",
  "state.unmet": "{hours}h unmet load",
  "state.noUnmet": "0h unmet",
  "state.locks.one": "{count} lock",
  "state.locks.other": "{count} locks",
  "state.assumption": "assumption: {area} cleared",

  /* ---- geography provenance -------------------------------------------- */
  "geo.summary": "How {theseAreas} are defined",
  "geo.resolved": "{count} in scope · provenance resolved",
  "geo.unresolved": "{count} in scope · {unresolved} of 3 components unresolved",
  "geo.unobserved":
    "The loaded artifact carries no observation for {areas}. Those areas receive the guaranteed minimum and no forecast weight, and the evidence and forecast sections describe the artifact's own geography rather than this one.",
  "geo.source":
    "Area list {version}, from the organization profile <c>{profileId}</c>. Every operating number on this page — budget, floor, continuity reserve, allocation increment, team count, and the assumed hourly rate — comes from that file.",
  "geo.componentAreaList": "Area list",
  "geo.componentBoundaries": "Boundaries",
  "geo.componentAdjacency": "Adjacency",
  "geo.statusResolved": "resolved",
  "geo.statusProvisional": "provisional",
  "geo.statusUnresolved": "no citable source",

  /* ---- the deployment's own words for its places ------------------------
   *
   * A profile names its own places, so the place noun is data, not copy. Each
   * noun therefore ships every grammatical form the copy needs — including
   * the ones Spanish inflects and English does not — so no message has to
   * build a noun phrase out of an article and a word.
   */
  "places.serviceArea": "service area",
  "places.serviceArea.plural": "service areas",
  "places.serviceArea.a": "a service area",
  "places.serviceArea.some": "some service areas",
  "places.serviceArea.these": "these service areas",
  "places.serviceArea.counted": "the {count} service areas",
  "places.serviceArea.everyOneOf": "Every one of the {count} service areas",
  "places.neighborhood": "neighborhood",
  "places.neighborhood.plural": "neighborhoods",
  "places.neighborhood.a": "a neighborhood",
  "places.neighborhood.some": "some neighborhoods",
  "places.neighborhood.these": "these neighborhoods",
  "places.neighborhood.counted": "the {count} neighborhoods",
  "places.neighborhood.everyOneOf": "Every one of the {count} neighborhoods",
  "places.township": "township",
  "places.township.plural": "townships",
  "places.township.a": "a township",
  "places.township.some": "some townships",
  "places.township.these": "these townships",
  "places.township.counted": "the {count} townships",
  "places.township.everyOneOf": "Every one of the {count} townships",
  "places.district": "district",
  "places.district.plural": "districts",
  "places.district.a": "a district",
  "places.district.some": "some districts",
  "places.district.these": "these districts",
  "places.district.counted": "the {count} districts",
  "places.district.everyOneOf": "Every one of the {count} districts",
  "places.borough": "borough",
  "places.borough.plural": "boroughs",
  "places.borough.a": "a borough",
  "places.borough.some": "some boroughs",
  "places.borough.these": "these boroughs",
  "places.borough.counted": "the {count} boroughs",
  "places.borough.everyOneOf": "Every one of the {count} boroughs",
  "places.precinct": "precinct",
  "places.precinct.plural": "precincts",
  "places.precinct.a": "a precinct",
  "places.precinct.some": "some precincts",
  "places.precinct.these": "these precincts",
  "places.precinct.counted": "the {count} precincts",
  "places.precinct.everyOneOf": "Every one of the {count} precincts",
  "places.corridor": "corridor",
  "places.corridor.plural": "corridors",
  "places.corridor.a": "a corridor",
  "places.corridor.some": "some corridors",
  "places.corridor.these": "these corridors",
  "places.corridor.counted": "the {count} corridors",
  "places.corridor.everyOneOf": "Every one of the {count} corridors",
  "places.area": "area",
  "places.area.plural": "areas",
  "places.area.a": "an area",
  "places.area.some": "some areas",
  "places.area.these": "these areas",
  "places.area.counted": "the {count} areas",
  "places.area.everyOneOf": "Every one of the {count} areas",
  "count.0": "zero",
  "count.1": "one",
  "count.2": "two",
  "count.3": "three",
  "count.4": "four",
  "count.5": "five",
  "count.6": "six",
  "count.7": "seven",
  "count.8": "eight",
  "count.9": "nine",
  "count.10": "ten",
  "count.11": "eleven",
  "count.12": "twelve",

  /* ---- guided tour ------------------------------------------------------ */
  "guide.stepCount": "Step {step} of {total} · ← → keys · Esc stops",
  "guide.done": "Done — press Next to continue.",
  "guide.yourTurn": "Your turn:",
  "guide.stop": "Stop",
  "guide.pause": "Pause",
  "guide.play": "Play",
  "guide.back": "Back",
  "guide.finish": "Finish",
  "guide.doItForMe": "Do it for me",
  "guide.next": "Next",
  "guide.revealTitle": "Start with the question",
  "guide.revealTask": "Press “Test the drop”.",
  "guide.revealBody":
    "A coordinator's real question: the headline estimate fell, so is that good news? Open the evidence behind the drop before treating it as an answer.",
  "guide.evidenceTitle": "Read what actually moved",
  "guide.evidenceBody":
    "The parts moved in opposite directions: observed individuals rose from {indFrom} to {indTo} (+{indPct}%) while tents and structures fell from {strFrom} to {strTo}.",
  "guide.evidenceBlocks":
    " People were seen in more places, not fewer: blocks with at least one observed individual went from {from} to {to}.",
  "guide.evidenceTail":
    " What dropped was tents. A conventional dashboard reports where a count rose or fell; this tool tests whether the ruler itself changed before anyone acts on it.",
  "guide.forecastTitle": "A forecast rehearsal, not a prophecy",
  "guide.forecastBody":
    "Everything here is frozen at December 2025. Three simple models compete on rolling held-out months, and the winner projects {point} for {period} with a historical 80% residual band of {lower}–{upper}. That band covered only {coverage}% of past checks — the miss stays on screen instead of becoming false confidence.",
  "guide.generateTitle": "The plan is already on the table",
  "guide.generateBody":
    "The tool opened mid-work: {budget} assumed staff-hours are already split across {countedAreas} — every area keeps the guaranteed minimum you set, and the rest follows where more people are expected. Change the budget or the floor and it recomputes instantly. It proposes; it never dispatches.",
  "guide.compareTitle": "See what the minimum protects",
  "guide.compareTask": "Select the “0h · no minimum” floor.",
  "guide.compareBody":
    "With no minimum, hours follow the forecast alone and {someAreas} are left with almost nothing. That view is an audit of the tradeoff, never a recommendation.",
  "guide.restoreTitle": "Never leave the audit view on",
  "guide.restoreTask": "Select the “{floor}h · default” floor to restore the minimum.",
  "guide.restoreBody":
    "Restoring the minimum guarantees every {areaNoun} keeps a visit. The floor is a visible policy you chose, not something the model learned.",
  "guide.lockTitle": "Override it like a coordinator",
  "guide.lockTask": "Lock {aArea} (try {area}), then press “Recompute unlocked hours”.",
  "guide.lockBody":
    "Local knowledge outranks the model. A locked line is preserved exactly and disclosed in the brief; recomputing rebalances only the unlocked hours and never silently repairs your choice.",
  "guide.exploreTitle": "Stress-test the obvious action",
  "guide.exploreTask": "Select {aArea} on the plan map, then press “Explore this assumption”.",
  "guide.exploreBody":
    "The most reached-for action is a clearance. Here you audit one honestly: you state how much of that area's load shifts next door instead of being resolved, and the plan reacts. No setting makes the need smaller without assuming it away in the open — the data cannot show who moves where, and this tool refuses to pretend otherwise.",
  "guide.auditTitle": "The ruler gets audited too",
  "guide.auditBody":
    "Even the measuring instrument gets checked: computer vision reads the scanned field sheets behind the published counts — fully offline — and it catches its own mistakes. Read at one scan resolution, the City Center handwritten total comes back 157; read at another, 152, which is what the sheet shows, and 152 plus 14 tents times 1.75 is 176.5, published 177. Two full readings agree on 97.5 percent of recovered values; the gap is the instrument's own error bar, surfaced instead of hidden. The OCR engine is swappable, so EyePop's hosted abilities drop in with one flag. Vision that audits the instrument, never the people.",
  "guide.briefTitle": "Leave with the brief",
  "guide.briefTask": "Press “Copy decision brief”.",
  "guide.briefBody":
    "The brief carries the evidence, the uncertainty, the policy settings, your overrides, and any assumption you explored. No login, no live API, no person-level model, and no LLM behind any number. Aggregate places only: nothing here tracks people, infers movement, or dispatches staff automatically. You decide which ruler governs the next shift.",
  "guide.firstArea": "the first area",

  /* ---- the link that hands a plan to a colleague ------------------------- */
  "link.eyebrow": "Send this plan",
  "link.lede":
    "The whole plan travels in the link: the hours you set, the guaranteed minimum, every human lock, and the two assumptions you stated. Nothing is stored anywhere, and the link carries neighborhood names and hour counts only — no records, no locations, nothing about any person.",
  "link.copy": "Copy link to this plan",
  "link.readBeforeSending": "Read it before you send it",
  "link.copied":
    "Link copied. Opening it rebuilds this plan exactly, with no account and no server.",
  "link.copyFailed": "Clipboard unavailable. Select the link below and copy it by hand.",

  /* ---- exports ------------------------------------------------------------ */
  "export.eyebrow": "Take it with you",
  "export.lede":
    "The spreadsheet and the printed plan both carry the reason for every hour, word for word. The shift sheet is the pocket version: neighborhoods, hours, reasons, and what this is not.",
  "export.csv": "Download spreadsheet (CSV)",
  "export.print": "Print plan / save as PDF",
  "export.csvSaved":
    "Spreadsheet saved. Every row carries the reason for its hours and the limits of this plan.",
  "export.csvBlocked":
    "This browser blocked the download. Use Print, or copy the decision brief instead.",
  "export.printOpened":
    "Print dialog opened. Choose Save as PDF to keep the plan, its reasons, and the brief in one file.",
  "export.printBlocked":
    "This browser blocked printing. Use the spreadsheet, or copy the decision brief instead.",
  "export.disclosureLine":
    "Planning aid for human review. It allocates staff time only: it does not authorize enforcement, does not track people, does not establish cause, and does not decide who is eligible for any service.",
  "print.title": "Still Here SD · coverage plan",
  "print.metaFloor":
    "{budget} staff-hours · {floor}h guaranteed minimum per neighborhood · {allocated} of {budget} hours allocated",
  "print.metaNoFloor":
    "{budget} staff-hours · no guaranteed minimum — comparison view · {allocated} of {budget} hours allocated",
  "print.source": "{label} · {artifact} · source data through {date}.",
  "print.tableCaption": "Planned staff-hours by neighborhood, with the reason for each amount.",
  "print.thNeighborhood": "Neighborhood",
  "print.thPlannedHours": "Planned staff-hours",
  "print.thWhy": "Why this amount",
  "print.thSetByPerson": "Set by a person",
  "print.thMovedByMinimum": "Hours moved away by the minimum",
  "print.allNeighborhoods": "All neighborhoods",
  "print.totalReason": "sum of the rows above, against the {budget} staff-hours you set",
  "print.yes": "yes",
  "print.no": "no",
  "print.briefHeading": "Decision brief",
  "csv.colNeighborhood": "neighborhood",
  "csv.colPlannedStaffHours": "planned_staff_hours",
  "csv.colWhyThisAmount": "why_this_amount",
  "csv.colSetByAPerson": "set_by_a_person",
  "csv.colGuaranteedMinimumHours": "guaranteed_minimum_hours",
  "csv.colMovedByMinimumHours": "planning_load_moved_by_the_minimum_hours",
  "csv.colLimits": "limits",

  /* ---- shift sheet --------------------------------------------------------- */
  "sheet.open": "Open shift sheet",
  "sheet.close": "Close",
  "sheet.print": "Print / save as PDF",
  "sheet.title": "Shift sheet",
  "sheet.metaFloor": "{budget} staff-hours · {floor}h guaranteed minimum per neighborhood",
  "sheet.metaNoFloor": "{budget} staff-hours · no guaranteed minimum — comparison view",
  "sheet.draftNote": "Draft for coordinator review. Nobody is dispatched by it.",
  "sheet.hours": "{hours} h",
  "sheet.whyLabel": "Why this amount:",
  "sheet.setByPerson": "Set by a person",
  "sheet.belowMinimum": "Below the minimum",
  "sheet.minimumMet": "{floor}h minimum met",
  "sheet.movedAway": "{hours}h moved away by the minimum",
  "sheet.allNeighborhoods": "All neighborhoods",
  "sheet.total": "{allocated} / {budget} h",
  "sheet.assumption":
    "These hours include an assumption you stated: {area} modeled as cleared, with {pct}% of its planning load assumed to shift to adjacent areas. Assumed, not observed.",
  "sheet.source":
    "{label} · {artifact} · source data through {date}. Aggregate place-level evidence only: no block records, no block-level geometry, no person-level data.",

  /* ---- the decision brief ---------------------------------------------------- */
  "decision.heading": "STILL HERE SD · NEXT-SHIFT DECISION BRIEF",
  "decision.statusReady": "Status: READY FOR COORDINATOR REVIEW — not automatic dispatch",
  "decision.statusProvisional": "Status: PROVISIONAL OFFLINE SNAPSHOT — not automatic dispatch",
  "decision.sourceGenerated":
    "Source: {label}. Artifact: {artifact}; source data through {date}; generated analysis.",
  "decision.sourceEmbedded":
    "Source: {label}. Artifact: {artifact}; source data through {date}; embedded offline fallback.",
  "decision.method":
    "Method: same-month comparison on the fixed {panel}-block panel under the POST2020 method; block-map components are separately digitized observations, not unique people.",
  "decision.evidence":
    "Evidence: {classification}. {fromPeriod} to {toPeriod}: observed individuals {indFrom} → {indTo} (+{indPct}%); tents/structures {strFrom} → {strTo} ({strPct}%).{thresholds} The mixed-unit index is secondary, not a person count.{hhi}",
  "decision.evidenceThresholds":
    " Blocks with ≥1 observed individual {oneFrom} → {oneTo}; blocks with ≥2 {twoFrom} → {twoTo}.",
  "decision.evidenceActiveBlocks": " Active mixed-component blocks {from} → {to} (+{pct}%).",
  "decision.evidenceHhi": " Individual HHI was nearly unchanged ({from} → {to}).",
  "decision.classificationWiderFootprint": "Wider observed-individual footprint",
  "decision.forecast":
    "Historical one-step-ahead planning scenario (data frozen Dec 2025): {period} {point}; historical 80% residual interval {lower}–{upper}. {model}; rolling-origin MAE {mae}; empirical coverage {coverage}% across {folds} folds. Not a live future forecast or a guaranteed probability interval.",
  "decision.scenarioGuardOn":
    "Illustrative coverage-continuity scenario for human review: {budget} staff-hours; user-set guard on ({floor}h demo-policy minimum). {rows}.{audit}",
  "decision.scenarioGuardOff":
    "Illustrative coverage-continuity scenario for human review: {budget} staff-hours; user-set guard off — audit only. {rows}.{audit}",
  "decision.scenarioRow": "{area}: {hours}h",
  "decision.scenarioRowLocked": "{area}: {hours}h (human lock)",
  "decision.scenarioRowNoHours": "{area}: —h",
  "decision.scenarioRowNoHoursLocked": "{area}: —h (human lock)",
  "decision.auditRange":
    " Area forecasts are noisier than the aggregate (held-out WAPE ranges {min}%–{max}%).",
  "decision.auditUnavailable":
    " Area-level audit WAPE is unavailable in this artifact; do not infer equal accuracy.",
  "decision.assumption":
    "Stress-test assumption active: {area} modeled as cleared, with {pct}% of its planning load assumed to shift to adjacent areas ({shifted} shifted, {resolved} assumed resolved). An explored assumption for review, not a prediction: the source data cannot verify displacement (April 2026 City Auditor).",
  "decision.cost":
    "Cost view — operator-set assumption, not a measured or published figure: at an assumed {rate}, the plan's {hours} staff-hours cost {total}.{floorLine} The rate is set by the operating organization, is derived from no source in this artifact, and enters no allocation: identical plans are produced at every rate. Costs are stated per staff-hour, per area, and per plan only; nothing here is a cost per person, per contact, or per anyone covered.",
  "decision.costFloor":
    " {sentence} That is {hours} hours moved plan-wide by the guaranteed minimum, priced at the same assumed rate.",
  "decision.triggers":
    "Review triggers: new month, budget or boundary change, wider interval, infeasible floor, or local knowledge conflict.",
  "decision.privacy":
    "Privacy and authorization boundary: aggregate place-level evidence only; no block records or block-level geometry ship (the map draws schematic outlines, not surveyed boundaries). This does not track people, establish causality, authorize enforcement, or dispatch staff automatically.",

  /* ---- planner messages, translated at the display boundary ------------------- */
  "planText.everyAreaKeeps": "{everyOneOf} keeps at least {floor} hours.",
  "planText.noMinimum": "No minimum applied: hours follow the forecast alone.",
  "planText.budgetNotWhole": "The staff-hour budget must be a nonnegative whole number.",
  "planText.floorNotWhole": "The coverage-continuity floor must be a nonnegative whole number.",
  "planText.lockBelowFloor":
    "Locked hours must be whole numbers at or above the {floor}-hour floor.",
  "planText.lockNotWhole": "Locked hours must be nonnegative whole numbers.",
  "planText.infeasibleFloors":
    "No feasible plan: locks and coverage floors require {required} hours, but the budget is {budget}.",
  "planText.infeasibleAllLocked.one":
    "No feasible plan: every area is locked, leaving {count} unassigned hour. Unlock an area or make the locks sum to the budget.",
  "planText.infeasibleAllLocked.other":
    "No feasible plan: every area is locked, leaving {count} unassigned hours. Unlock an area or make the locks sum to the budget.",
  "planText.infeasibleShort": "No feasible plan: {allocated} of {budget} hours were assigned.",
  "reason.floorPlusShare":
    "{floor}h user-set coverage-continuity floor plus a proportional share of the remaining hours using the uncertainty-aware planning load.",
  "reason.upperBoundPlusFloor": "upper forecast bound + {floor}h coverage floor",
  "reason.upperBoundPlusFloorUnstated": "upper forecast bound + coverage floor",
  "reason.coverageFloorOnly":
    "The loaded artifact carries no observation for this area. It receives the guaranteed minimum and no forecast weight.",

  /* ---- artifact tokens ---------------------------------------------------------- */
  "token.demo_v1_training": "demo v1 training",
  "token.demo_v1_forecast_selection": "demo v1 forecast selection",
  "token.demo_v1_planner": "demo v1 planner",
  "token.estimated_person_equivalents": "estimated person equivalents",
  "token.area_total": "area total",
  "token.publisher_reported": "publisher reported",

  /* ---- standalone planner panel --------------------------------------------------- */
  "panel.title": "3. Plan {hours}",
  "panel.errorTitle": "3. Plan the next shift",
  "panel.cannotProduce": "✕ This plan cannot be produced.",
  "panel.budgetLabel": "Available staff-hours",
  "panel.budgetEmpty": "Enter the number of staff-hours available.",
  "panel.budgetNegative": "Available hours cannot be negative.",
  "panel.budgetErrorTail": "The plan below still reflects {hours}.",
  "panel.guardLine":
    "Coverage guard: ON · Minimum {floor} per included area · {count} areas included",
  "panel.noPlanProduced":
    "✕ No plan was produced. The coverage floor was not lowered to fit the budget.",
  "panel.floorDominant":
    "⚠ The coverage floor is deciding most of this plan, not the forecast. Only {discretionary} of {budget} is distributed by relative load. Read the split as coverage, not as a ranking of need.",
  "panel.tableCaption":
    "Suggested hours per area, ordered by area name. This table shows a coverage plan. It does not set priority order.",
  "panel.thArea": "Area",
  "panel.thSuggested": "Suggested",
  "panel.thSetByCoordinator": "Set by coordinator",
  "panel.thUnguarded": "Without the guard (audit view)",
  "panel.thWhy": "Why this amount?",
  "panel.movedAway": "({hours} moved away by the floor)",
  "panel.lockLabel": "Lock {area}",
  "panel.lockedLabel": "Locked {area}",
  "panel.hoursFor": "Hours for {area}",
  "panel.whyButton": "Why this amount?",
  "panel.allocatedLine": "Allocated {allocated} of {budget} ·",
  "panel.unmetLine": "Unmet planning load {hours}",
  "panel.roundingResidue": " · {hours} unallocated by rounding",
  "panel.coordinatorSet":
    "✎ {locked} of {total} assignments were set by the coordinator and preserved through recomputation.",
  "panel.hideGuardColumn": "Hide without the coverage guard",
  "panel.showGuardColumn": "Compare without the coverage guard",
  "panel.reset": "Reset",
  "panel.unguardedNote":
    "The unguarded column is an audit view showing what a purely proportional split would give. It is shown for comparison only.",
  "panel.hoursUnit": "{hours} h",

  /* ---- actuals empty state ---------------------------------------------------------- */
  "actuals.title": "No actuals recorded yet",
  "actuals.defaultMeasure": "contacts or engagements",
  "actuals.defaultWho": "The operating organization",
  "actuals.lede":
    "Nothing here is missing or broken. No one has reported delivered hours to this deployment, so there is nothing to show — and an empty month is not a month with zero outreach.",
  "actuals.wouldSupply": "{who} would supply, once a month, one row per planning area:",
  "actuals.plannedHours": "Planned hours",
  "actuals.plannedHoursText": "the staff hours the plan called for in that area.",
  "actuals.deliveredHours": "Delivered hours",
  "actuals.deliveredHoursText":
    "the staff hours actually worked there. Zero is a real answer and the one most worth recording honestly.",
  "actuals.engagementCount": "One engagement count",
  "actuals.engagementCountText":
    "{measure}, in whatever the organization already counts. A number of encounters, never a list of people. Counts of one to four are withheld under the same small-cell rule that governs every other number here, and show as withheld rather than as zero.",
  "actuals.format":
    "The format is one JSON file against <c>config/schema/actuals.v1.schema.json</c>, at area-and-month grain. Names, dates of birth, client or case identifiers, case-management exports, addresses, coordinates, and any per-person or per-encounter row are refused at import: this tool has no concept of a person as an entity and is not the place to build one.",
  "actuals.instructions":
    "Full instructions, including what will and will not later be computed from these numbers, are in <c>{docs}</c>.",

  /* ---- contracted capacity context ------------------------------------------------------ */
  "capacity.eyebrow": "For comparison, not for planning",
  "capacity.title": "What the City has contracted for",
  "capacity.body":
    "The City's street-outreach contract requires <b>{staff} outreach staff a day</b>, across {shifts} shifts, {days} days a week, plus a team leader. It is here so you know what exists alongside what you are planning.",
  "capacity.notComparable":
    "<b>This is not a target and not an input.</b> It states what a contract requires, not what was actually in the field, and it covers a different program from the plan above. Nothing on this page divides one by the other, because the result would look like a coverage ratio and would not be one.",
  "capacity.quoteLead": "From the executed agreement:",
  "capacity.sourceNote":
    "{title}, PRA request {request}. Re-fetch and check it against its recorded fingerprint with <c>python scripts/fetch_pra.py --doc-id {doc}</c>.",

  /* ---- independent source agreement ---------------------------------------------------- */
  "sourceAgreement.eyebrow": "Checked against another transcription",
  "sourceAgreement.title": "A second digitization of the same maps",
  "sourceAgreement.intro":
    "The counts on this page were read off paper maps by one team. A different team, at the San Diego Regional Data Library, read the same maps independently and published their own version. Comparing the two says how much of the trend is the thing being counted and how much is the reading of it.",
  "sourceAgreement.headline":
    "Across <b>{months} overlapping months</b> the two agree at a median of <b>{median}</b> — within one percent — and the yearly medians move between {low} and {high} with no drift.",
  "sourceAgreement.spread": "{within5}% of months agree within 5%, {within10}% within 10%.",
  "sourceAgreement.notWhat":
    "<b>This is evidence about transcription, not a second count.</b> It never enters the forecast and never becomes allocation weight. Two readings agreeing does not make either one a census of people.",
  "sourceAgreement.publisherTitle": "Checked against the publisher's own figures",
  "sourceAgreement.publisherBody":
    "The comparison above is with a second reading of the same maps. This one is stronger and different in kind: it sets the totals on this page against the numbers the Downtown San Diego Partnership itself published. Across the <b>{months} months</b> where the two series meet ({from} to {to}), <b>{equal} are exactly equal</b>.",
  "sourceAgreement.publisherDiffer":
    "The other {count} differ by exactly one, and the figure here is the higher in every case: {months}.",
  "sourceAgreement.publisherMechanism":
    "<b>Why is not known.</b> A difference that is always one and always the same direction is a convention rather than a disagreement, and the obvious candidate — rounding — was tested and does not fit. It is recorded as unexplained rather than given a tidy story, so that the next person to notice it finds it already known.",
  "sourceAgreement.publisherLimit":
    "The published series ends {to}, so this check says nothing about the months after it.",
  "sourceAgreement.defectsTitle": "Where they disagree, and why that is useful",
  "sourceAgreement.defectsIntro":
    "The disagreements are not scattered. They cluster, which is what a fixable transcription problem looks like rather than noise:",
  "sourceAgreement.defectPair":
    "{a} and {b} are near mirror images ({ratioA} and {ratioB}) — the signature of a survey landing on the wrong side of a month boundary.",
  "sourceAgreement.defectRun":
    "{months} sit together near {ratio}, which reads as an incomplete stretch of digitization rather than a coding fault.",
  "sourceAgreement.absent":
    "{months} are in the published series and absent from the other transcription entirely.",
  "sourceAgreement.provenance": "Package {version}, retrieved {retrieved}. {attribution}",

  /* ---- plan against delivered ---------------------------------------------------------- */
  "actuals.compare.eyebrow": "Last month",
  "actuals.compare.title": "The plan against what was delivered",
  "actuals.compare.intro":
    "A plan says how many staff hours each area will get. An actuals file says how many were worked there. The gap between the two is the error in the plan itself, one area at a time.",

  "actuals.compare.loadLabel": "Load an actuals file",
  "actuals.compare.loadHint":
    "The file is read here, in this browser, and stays in it. Nothing is uploaded: there is no server behind this page to upload anything to.",
  "actuals.compare.storedNote": "Held in this browser only, until you remove it.",
  "actuals.compare.clear": "Remove these actuals",
  "actuals.compare.monthLabel": "Month",

  "actuals.compare.reportedBy": "Reported by the {role} at {who}. Last updated {date}.",
  "actuals.compare.method": "How the figures were collected: {method}",
  "actuals.compare.measure": "{label} — {definition}",

  "actuals.compare.colArea": "Area",
  "actuals.compare.colPlanned": "Planned hours",
  "actuals.compare.colDelivered": "Delivered hours",
  "actuals.compare.colError": "Plan error",
  "actuals.compare.colEngagement": "{measure}",
  "actuals.compare.tableCaption": "Planned and delivered staff hours by area, for {month}",

  "actuals.compare.plannedNone": "No plan recorded",
  "actuals.compare.errorUnresolved": "Unresolved: no plan to compare against",
  "actuals.compare.errorUnder": "{hours} h under plan",
  "actuals.compare.errorOver": "{hours} h over plan",
  "actuals.compare.errorOnPlan": "On plan",
  "actuals.compare.engagementSuppressed": "Withheld: too few to publish",
  "actuals.compare.engagementNotRecorded": "Not recorded",

  "actuals.compare.absentTitle": "Reported no row for {month}",
  "actuals.compare.absentBody":
    "{areas}. A month absent from the file is unknown, not zero: it has not been shown that nothing was delivered there.",

  "actuals.compare.noTotal": "Why there is no total",
  "actuals.compare.noTotalBody":
    "A sum across areas or across months would let a reader subtract their way back to a count this file withholds, so the area-month row stays the published grain. Read the rows; do not add them up.",

  "actuals.compare.notScorableTitle": "What this comparison is not",
  "actuals.compare.notScorableCountForecast":
    "It is not a score of the published forecast. That forecast predicts an observed count from the point-in-time methodology, and no figure in an actuals file observes a count of that kind.",
  "actuals.compare.notScorableEngagementResponse":
    "It is not evidence that hours move an engagement count. Two figures sitting in one row do not establish that one produced the other, and this file's own never-list rules that question out.",
  "actuals.compare.notScorableAreaChange":
    "It is not a reading of how an area changed. Nothing in an actuals file observes an area between plans, so no such change can be recovered from it.",

  "actuals.compare.refusedTitle": "This file was refused",
  "actuals.compare.refusedIntro":
    "Nothing was loaded. Each finding below names the field it came from, so it can be fixed in the file rather than guessed at.",
  "actuals.compare.warningsTitle": "Loaded, with warnings",
  "actuals.compare.warningsIntro":
    "These do not block the file. They are figures worth checking before the comparison is read.",
  /* ---- responsible-data cards --------------------------------------------------------- */
  "cards.hideDetails": "Hide details for {title}",
  "cards.showDetails": "Show details for {title}",
  "cards.noteLabel": "Note.",
  "cards.suppression":
    "<b>◇ Some counts are withheld.</b> {cells} values and {rows} whole months are withheld because they fall below {threshold}. A withheld count is not zero. It means too few people were observed to publish the number without identifying someone.",
  "cards.aiTitle": "How this was produced",
  "cards.aiBody":
    "No generative model determines the evidence result, the forecast, or the allocation. All three are deterministic rules, and the same inputs produce the same output every run.",
  "cards.aiUses": "A generative model was used for the following, each reviewed by a person:",

  /* ---- accessibility affordances added in the WCAG 2.1 AA pass ---------- */
  "app.skipToMain": "Skip to main content",
  /**
   * The one phrase every map caption must carry, in this locale.
   *
   * "Simplified neighborhood boundaries" was the old wording and it implied a
   * real boundary that had been simplified. No such boundary exists: the
   * publisher names its areas and publishes no boundary file. The phrase below
   * is registered here so `i18n.test.tsx` can require every caption to use it,
   * in every shipped locale — a caption reworded in one language and not the
   * other is how the Spanish build ended up making a claim the English build
   * had already retracted.
   */
  "map.outlinePhrase": "schematic outlines, not surveyed boundaries",
  "map.provenance":
    "These are schematic outlines, not surveyed boundaries. The publisher names its areas but publishes no boundary file; these shapes were derived from a private grid this project cannot pin to a checksum or re-obtain, and the deployment marks its boundary and adjacency sources unresolved. Read them as a diagram of which area is which, and never as where one area stops.",
  "guide.stepAnnounce": "Step {step} of {total}: {title}",
} as const;

export type MessageKey = keyof typeof EN_MESSAGES;
