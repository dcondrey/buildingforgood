/**
 * El catálogo en español.
 *
 * Terminología: cada decisión de vocabulario con consecuencias de política
 * está anotada en `docs/project/I18N.md`. Las tres reglas que gobiernan este
 * archivo:
 *
 * 1. **Lenguaje centrado en la persona.** "personas sin vivienda", nunca
 *    términos que estigmatizan.
 * 2. **Un mensaje es una oración completa.** Los marcadores `{nombre}` llevan
 *    los números y los nombres; nada aquí se arma juntando fragmentos.
 * 3. **Los rechazos sobreviven a la traducción.** Ninguna cadena de este
 *    archivo afirma que alguien se movió, que una política causó algo, que un
 *    lugar necesita intervención policial, ni que exista cupo o elegibilidad.
 *    `src/refusals.test.ts` lo verifica en español, no solo en inglés.
 */

import type { MessageKey } from "./en";

export type Catalogue = Record<MessageKey, string> & Record<string, string>;

export const ES_MESSAGES: Catalogue = {
  /* ---- estructura de la aplicación -------------------------------- */
  "app.skipToDecision": "Saltar a la decisión",
  "topbar.tagline": "Planificador de continuidad del trabajo de calle",
  "topbar.decisionHorizon": "Horizonte de decisión",
  "topbar.availableCapacity": "Capacidad disponible",
  "topbar.availableStaffHours": "Horas de personal disponibles",
  "topbar.hours": "horas",
  "topbar.budgetHelp":
    "Escriba un número entero de {min} a {max}. Este es un escenario de demostración, no datos reales de dotación de personal.",
  "topbar.view": "Vista",
  "topbar.viewStory": "Relato",
  "topbar.viewWorkspace": "Mapa de trabajo",
  "topbar.guide": "Demostración guiada",
  "topbar.exitProjector": "Salir del modo proyector",
  "topbar.projectorMode": "Modo proyector",
  "topbar.dataAndLimits": "Datos y límites",
  "topbar.language": "Idioma",
  "footer.tagline": "Mire más allá del conteo. Planifique el próximo turno.",
  "footer.principles": "Lugares agregados. Incertidumbre explícita. Decisiones humanas.",

  /* ---- vigencia del artefacto ------------------------------------- */
  "currency.unknownBadge": "Vigencia desconocida",
  "currency.unknownBadgeNote": "este artefacto no declara su vigencia",
  "currency.currentThrough": "Datos hasta {month}",
  /** La frase que debe llevar todo estado de vigencia. Véase `currency.thresholdPhrase` en `en.ts`. */
  "currency.thresholdPhrase": "umbral de vigencia",
  "currency.overdue": "fuera del umbral de vigencia",
  "currency.onCadence": "dentro del umbral de vigencia",
  "currency.eyebrow": "Vigencia del artefacto",
  "currency.chipNone": "Sin vigencia declarada",
  "currency.chipOverdue": "Fuera del umbral de vigencia",
  "currency.chipCurrent": "Dentro del umbral de vigencia",
  "currency.noBlock":
    "Este artefacto no trae un bloque de vigencia, así que esta versión no puede decir cuánto atraso lleva respecto del calendario. La instantánea sin conexión incluida en el paquete siempre está en este estado. Ejecute la actualización mensual para producir un artefacto que declare su propia antigüedad.",
  "currency.nextRefresh": "Próxima actualización prevista para {month} según {basis}.",
  "currency.frozen":
    "<b>La repetición de enero de 2026 queda congelada, de forma permanente.</b> Es la muestra de método: el único mes con el que este proyecto se califica a sí mismo, usando solo datos que existían antes de él. Ningún artefacto más nuevo lo reemplaza, y nada de lo que sigue puede volver a calificarlo.",
  "currency.excludedEyebrow": "Observado · no apto para el modelo",
  "currency.guard":
    "Estas son observaciones excluidas. No son un pronóstico, no son una corrección y no son datos más nuevos que reemplacen la repetición de arriba. Los valores son equivalentes de persona ajustados por multiplicadores, de una fuente cuya cadencia de publicación se rompió. Ninguna fila de aquí entrena un modelo, selecciona un modelo ni mueve una hora de personal.",
  "currency.groundsLead": "Por qué están excluidas:",
  "currency.promotionRuleLabel": "Regla de promoción.",
  "currency.viewRows": "Ver las {count} filas excluidas",
  "currency.tableCaption":
    "Observado y excluido de {uses}. Los valores son {unit}, no conteos de personas.",
  "currency.thMonth": "Mes",
  "currency.thArea": "Área",
  "currency.thSeries": "Serie",
  "currency.thValue": "Valor",
  "currency.thReportedAs": "Reportado como",
  "currency.thModelInput": "Entrada del modelo",
  "currency.excludedCell": "Excluido",
  "currency.sourceNote":
    "La transcripción, la procedencia y el protocolo de actualización están registrados en <c>{file}</c>.",

  /* ---- cajón de datos y límites ----------------------------------- */
  "disclosure.aria": "Divulgaciones de datos y limitaciones",
  "disclosure.eyebrow": "Artefacto local",
  "disclosure.title": "Trazable por diseño",
  "disclosure.source": "Fuente",
  "disclosure.currency": "Vigencia",
  "disclosure.currencyOverdue":
    "Datos de origen hasta {month}; fuera del umbral de vigencia que declara este artefacto.",
  "disclosure.currencyOnCadence":
    "Datos de origen hasta {month}; dentro del umbral de vigencia que declara este artefacto.",
  "disclosure.currencyNone":
    "Este artefacto no declara vigencia. Su actualidad se desconoce y no se infiere.",
  "disclosure.coverageThrough": "Cobertura hasta",
  "disclosure.loadedFrom": "Cargado desde",
  "disclosure.organizationProfile": "Perfil de la organización",
  "disclosure.organizationProfileValue": "{organization} · <c>{profileId}</c>. A cargo de: {role}.",
  "disclosure.operatingParameters": "Parámetros de operación",
  "disclosure.operatingParametersValue":
    "{areaCount} {areaNounPlural} dentro del alcance; presupuesto predeterminado de {budget} horas de personal para {horizonLabel} ({horizonDays} días); mínimo de cobertura de {floor} h; reserva de continuidad de {reserve} h; incrementos de asignación de {increment} h; {teams} equipos en turnos de {shift} h. Cada uno de estos valores viene del perfil, no es una constante de esta versión.",
  "disclosure.privacy": "Privacidad",
  "disclosure.privacyValue":
    "Sin registros por cuadra ni geometría a nivel de cuadra; el mapa dibuja contornos esquemáticos, no límites cartografiados. Las celdas pequeñas por área y componente se omiten.",
  "disclosure.aiUse": "Uso de IA",
  "disclosure.aiUseValue":
    "Solo asistencia durante el desarrollo; ninguna IA se ejecuta en el producto ni determina la evidencia, los pronósticos o las asignaciones.",
  "disclosure.nonGoal": "Fuera de objetivo",
  "disclosure.nonGoalValue":
    "Sin seguimiento de personas, sin aplicación de la ley, sin decisiones de elegibilidad y sin despacho automático.",
  "disclosure.pendingRequests": "Solicitudes pendientes",
  "disclosure.pendingRequestsValue":
    "Hay solicitudes de datos pendientes ante la San Diego Housing Commission, el Regional Task Force on Homelessness, el departamento de Homelessness Strategies & Solutions de la Ciudad y DSDP Clean & Safe. Los registros que respondan entran por los carriles documentados del registro de fuentes antes de cualquier uso analítico.",
  "disclosure.close": "Cerrar datos y límites",

  /* ---- un enlace compartido que esta versión no aceptó ------------- */
  "share.refusalAria": "Enlace compartido",
  "share.refusalEyebrow": "Enlace compartido",
  "share.refusalGeography":
    "Este enlace se construyó sobre otra lista de áreas ({detail}). Las horas y los nombres de área no se trasladan entre geografías distintas, así que no se aplicó. Usted está viendo el plan predeterminado de esta instalación, no el de quien lo envió.",
  "share.refusalUnreadable":
    "No se pudo leer este enlace ({field}: {detail}). Usted está viendo el plan predeterminado, no el de quien lo envió. Pídale que lo envíe de nuevo, sin cortes de línea ni acortadores.",

  /* ---- por qué se rechazó un enlace compartido, traducido donde se muestra ---- */
  "shareError.wholeNumberMax": "debe ser un número entero de 0 a {max}",
  "shareError.areaId": "debe ser un identificador de área",
  "shareError.areaIdLength": "debe tener de 1 a {max} caracteres",
  "shareError.areaIdLowercase":
    "debe ser un identificador de área en minúsculas, como east_village",
  "shareError.reportVolume":
    "se lee como volumen de reportes, que mide quién reporta y no quién está presente; un enlace compartido no lleva ningún campo así, y ninguna carga de planificación puede derivarse de uno",
  "shareError.personOrPoint":
    "se lee como un campo a nivel de persona o de punto geográfico; un enlace lleva únicamente identificadores de área y horas",
  "shareError.object": "debe ser un objeto",
  "shareError.notAllowlisted":
    "no está en la lista de lo que se puede compartir; un enlace lleva únicamente presupuesto, mínimo, resguardo, bloqueos y los dos supuestos declarados",
  "shareError.boolean": "debe ser verdadero o falso",
  "shareError.list": "debe ser una lista",
  "shareError.tooManyLocks": "debe contener como máximo {max} áreas",
  "shareError.lockPair": "debe ser un identificador de área y un número entero de horas",
  "shareError.repeatsArea": "repite un área",
  "shareError.fraction": "debe ser una fracción de 0 a 1",
  "shareError.numberMax": "debe ser un número de 0 a {max}",
  "shareError.geographyIdentifier": "debe ser un identificador de lista de áreas con versión",
  "shareError.geographyMismatch":
    "nombra la lista de áreas {theirs}; esta instalación planifica sobre {ours}",
  "shareError.notShareable": "no es un parámetro que se pueda compartir",
  "shareError.needsEscaping":
    "necesitaría escaparse, así que no es un valor que se pueda compartir",
  "shareError.repeated": "aparece más de una vez",
  "shareError.missing": "falta en el enlace",
  "shareError.wholeNumber": "debe ser un número entero",
  "shareError.version": "es de la versión {version}; esta versión lee enlaces de la versión 1",
  "shareError.onOrOff": "debe ser on u off",
  "shareError.lockPairs": "debe leerse como pares area_id:horas",
  "shareError.percent": "debe ser un porcentaje de 0 a 100",
  "shareError.number": "debe ser un número",

  /* ---- portada ---------------------------------------------------- */
  "hero.verifying": "Verificando los artefactos locales…",
  "hero.generated": "Análisis generado cargado",
  "hero.offline": "Instantánea de demostración sin conexión",
  "hero.kicker": "Decisión preparada · {focusArea} · {period}",
  "hero.title": "¿Menos carpas,<br><i>o menos personas?</i>",
  /** La frase que debe llevar la entradilla. Véase `hero.exhibitPhrase` en `en.ts`. */
  "hero.exhibitPhrase": "la muestra de método de San Diego, que se ve con cualquier perfil",
  "hero.lede":
    "La evidencia de esta página es la muestra de método de San Diego, que se ve con cualquier perfil: no cambia al cargar la geografía de otra organización; lo único que cambia es el plan de abajo. Sobre el panel fijo de 261 cuadras, la estimación de personas sin vivienda derivada por componentes en el centro de San Diego bajó 22% en un año, pero la caída vino de las carpas, no de las personas: las observaciones directas de personas subieron y aparecieron en 25 cuadras más que el año anterior. Esta herramienta muestra qué cambió, qué es incierto y a dónde debería ir el próximo turno de trabajo de calle.",
  "hero.compositionAria":
    "Comparación de la composición observada y de la huella de cuadras activas",
  "hero.peopleSeen": "Personas vistas en campo",
  "hero.tents": "Carpas y estructuras",
  "hero.vehicles": "Vehículos",
  "hero.blocksWherePeopleSeen": "Cuadras donde se vieron personas",
  "hero.activeBlocks": "Cuadras activas",
  "hero.samePanel": "Mismo mes · mismo método · mismas {panel} cuadras",
  "hero.decisionAria": "Resumen del escenario preparado",
  "hero.decisionEyebrow": "La decisión sobre la mesa",
  "hero.decisionQuestion":
    "Suponga que hay <b>{hours} horas de personal</b> disponibles para los turnos de trabajo de calle de la próxima semana. ¿A qué barrios deberían ir?",
  "hero.capacityNote":
    "Las horas son un supuesto editable, no datos de dotación de personal. Una instalación real usaría el propio calendario del proveedor.",
  "hero.prepared": "✓ Preparado",
  "hero.provisional": "◇ Provisional",
  "hero.travels":
    "Los límites de la evidencia y los disparadores de revisión viajan con el resultado.",
  "nav.aria": "Pasos de la decisión",
  "nav.testTheDrop": "Poner a prueba la caída",
  "nav.checkTheForecast": "Revisar el pronóstico",
  "nav.planTheShift": "Planificar el turno",
  "nav.humanReview": "Revisión humana",

  /* ---- cadena de evidencia ---------------------------------------- */
  "chain.aria": "Cadena de evidencia y decisión",
  "chain.verifiedSource": "Fuente verificada",
  "chain.comparablePanel": "Panel comparable",
  "chain.comparablePanelDetail": "{panel} cuadras fijas · mismo método",
  "chain.auditedScenario": "Escenario auditado",
  "chain.auditedScenarioDetail": "{folds} pliegues fuera de muestra · {coverage}% de cobertura",
  "chain.humanReview": "Revisión humana",
  "chain.humanReviewDetail": "Decide la coordinación",

  /* ---- sección 01 · poner a prueba la caída ------------------------ */
  "drop.eyebrow": "Qué cambió realmente",
  "drop.title": "Poner a prueba la caída",
  "drop.intro":
    "La estimación que baja se construye con tres cosas contadas en campo: personas, carpas y vehículos. Compare cada una sobre las mismas {panel} cuadras, de un enero al siguiente, y vea cuál bajó de verdad.",
  "drop.metricPeople": "Personas vistas en campo",
  "drop.metricTents": "Carpas y estructuras",
  "drop.metricVehicles": "Vehículos",
  "drop.metricBlocksOnePerson": "Cuadras con al menos una persona",
  "drop.metricActiveFootprint": "Huella activa",
  "drop.blocksLikeForLike": "+{blocks} cuadras · comparación equivalente",
  "drop.activeBlocksPct": "+{pct}% de cuadras activas",
  "drop.howToRead": "Cómo leer esta comparación",
  "drop.howToReadSub": "Panel, unidades y verificación de fechas",
  "drop.mixedIndexNote":
    "<b>Contexto secundario de componentes mezclados:</b> todas las cuadras activas {activeFrom} → {activeTo} (+{activePct}%); índice de unidades mezcladas {fromValue} → {toValue} ({changePct}%). El índice suma aritméticamente unidades de observación distintas —personas, estructuras y vehículos— y no es un conteo de personas únicas ni un total estimado de personas. Panel fijo en {panel} cuadras.",
  "drop.comparisonDefense":
    "Este es el par interanual del mismo mes más reciente disponible en el panel entregado: enero de 2025 es su fecha final, ambos meses usan el método POST2020 y se comparan exactamente las mismas {panel} cuadras.",
  "drop.revealButton": "Poner a prueba la caída",
  "drop.revealNote":
    "Mismo resultado en cada ejecución · datos locales incluidos · ninguna IA en el proceso",
  "drop.resultEyebrow": "Qué muestra la comparación sobre las mismas cuadras",
  "drop.resultWithSpatial":
    "Se vieron personas en más cuadras que el año pasado, repartidas de forma casi tan pareja como antes. Las carpas desaparecieron de muchas cuadras y se concentraron en menos. Estas son observaciones hechas en el lugar: no pueden decir quién se movió a dónde, ni por qué.",
  "drop.resultWithoutSpatial":
    "La actividad de campo llegó a más cuadras y a la vez se concentró más donde permaneció. Estas son observaciones hechas en el lugar: no pueden decir quién se movió a dónde, ni por qué.",
  "classification.widerFootprintPeople": "Se vieron personas en más lugares, no en menos",
  "classification.widerFootprintActivity": "La actividad de campo se extendió a más cuadras",
  "drop.humanReviewRequired": "Requiere revisión humana",
  "drop.componentProofAria":
    "Sensibilidad de la huella de personas observadas y de carpas en comparación equivalente",
  "drop.keyCheckEyebrow": "La verificación clave · mismas cuadras, con un año de diferencia",
  "drop.keyCheckTitle": "Se vieron personas en más cuadras, por estricto que sea el criterio",
  "drop.sameBlocksBothYears": "Las mismas 261 cuadras en ambos años",
  "drop.thresholdOnePerson": "Cuadras con ≥1 persona vista",
  "drop.thresholdTwoPeople": "Cuadras con ≥2 personas vistas",
  "drop.thresholdOneTent": "Cuadras con ≥1 carpa",
  "drop.thresholdTwoTents": "Cuadras con ≥2 carpas",
  "drop.blocksDelta": "{delta} cuadras",
  "drop.individualsConcentration": "Personas: concentración parecida",
  "drop.tentsConcentration": "Carpas: concentración más marcada",
  "drop.hhiWithEffectiveBlocks":
    "HHI {hhiFrom} → {hhiTo} · cuadras efectivas {blocksFrom} → {blocksTo}",
  "drop.derivedEyebrow": "Por qué la estimación ajustada puede bajar",
  "drop.derivedNote": "Estimación secundaria derivada de los multiplicadores POST2020",
  "drop.individuals": "Personas",
  "drop.structures": "Estructuras",
  "drop.vehicles": "Vehículos",
  "drop.derivedExplain":
    "La baja derivada viene sobre todo de las estructuras y queda parcialmente compensada por más personas observadas. Los componentes se digitalizaron a partir de mapas; esto no es un conteo de personas únicas ni la serie del total publicado.",
  "drop.exploreEvidence": "Explorar la evidencia de respaldo",
  "drop.exploreEvidenceSub": "Umbrales, geografía, límites y disparadores de revisión",
  "drop.distributionAria":
    "Sensibilidad secundaria de umbral y concentración de cuadras activas en unidades mezcladas",
  "drop.secondaryEyebrow": "Sensibilidad secundaria de unidades mezcladas",
  "drop.secondaryTitle": "Dependencia del umbral mezclado y HHI impulsado por la composición",
  "drop.notAPersonCount": "No es un conteo de personas",
  "drop.activeBlocksAtLeast.one": "Cuadras activas con ≥{count} unidad",
  "drop.activeBlocksAtLeast.other": "Cuadras activas con ≥{count} unidades",
  "drop.thresholdChurn": "{delta} · {entered} entraron / {exited} salieron",
  "drop.intensityConcentration": "Concentración de intensidad",
  "drop.hhiPct": "HHI +{pct}%",
  "drop.effectiveBlocks": "cuadras efectivas {from} → {to}",
  "drop.singleUnitNote":
    "Las cuadras de una sola unidad pasaron de {from} a {to} (+{change}), pero por sí solas no explican el +{activeChange} en ≥1, porque ≥2 también sube. El HHI {hhiFrom} → {hhiTo} responde a la composición; este índice mezclado secundario no establece una dispersión uniforme ni rastrea movimiento.",
  "drop.churnEyebrow": "Índice secundario de unidades mezcladas",
  "drop.churnTitle": "Rotación del índice dentro del panel estable",
  "drop.churnAria": "{increases} aumentos, {decreases} disminuciones, neto {net}",
  "drop.grossIncreases": "Aumentos brutos",
  "drop.grossDecreases": "Disminuciones brutas",
  "drop.churnMethodNote":
    "Personas, carpas o estructuras y vehículos cuentan aquí cada uno como una unidad cruda. Esto no es una estimación de personas; la huella está fija en {panel} cuadras.",
  "drop.aggregateContext": "Contexto agregado",
  "drop.whereSignalChanged": "Dónde cambió la señal",
  "drop.activeBlocksFormula": "Cuadras activas +{change}",
  "drop.evidenceFor": "Evidencia a favor",
  "drop.evidenceForText":
    "Las personas observadas aumentaron mientras las estructuras bajaron; las observaciones de personas alcanzaron más cuadras del panel fijo en los dos umbrales probados.",
  "drop.evidenceBoundary": "Límite de la evidencia",
  "drop.evidenceBoundaryText":
    "No se observan identidades, ni trayectorias de movimiento, ni explicación causal.",
  "drop.validityCheck": "Verificación de validez",
  "drop.validityCheckText":
    "Panel estable, datos faltantes declarados, etiquetas por época de la fuente mantenidas aparte.",
  "drop.challengeEyebrow": "Punto de control adversarial",
  "drop.challengeTitle": "¿Qué nos haría cambiar de opinión?",
  "drop.challengeBadge": "Abierto a revisión",
  "drop.challengeLede":
    "Este resultado es útil porque sus condiciones de falla son explícitas. Cualquiera de estos hallazgos rebajaría la conclusión o activaría una nueva revisión.",
  "drop.challengeMonths":
    "Que después se descubra que alguno de los meses emparejados está incompleto o mal clasificado.",
  "drop.challengeBoundary":
    "Que un cambio de límites o de método vuelva no comparable la comparación de 261 cuadras.",
  "drop.challengeDiscontinuity":
    "Que la revisión de la fuente explique la discontinuidad de 2023-2024 como un cambio de recolección.",
  "drop.challengeHeldOut":
    "Que datos nuevos fuera de muestra debiliten de forma relevante el error del pronóstico o la cobertura del intervalo.",
  "drop.challengeDigitization":
    "Que el error de digitalización medido por la auditoría de hojas de campo (dos lecturas hoy difieren en el {pct}% de los valores recuperados) crezca lo suficiente como para explicar por sí solo el cambio que se está interpretando en el centro.",

  /* ---- diagnóstico opcional de sesgo de atención ------------------- */
  "bias.summaryLabel": "Verificación opcional de sesgo de atención",
  "bias.summaryText": "La proporción de reportes de campamentos subió {points} puntos",
  "bias.excludedChip": "Excluido del planificador",
  "bias.eyebrow": "Get It Done · diagnóstico descriptivo",
  "bias.title": "¿Cambió la atención del público al reportar?",
  "bias.diagnosticOnly": "Solo diagnóstico · sin afirmación causal",
  "bias.matchedEyebrow": "Calendario emparejado · mismos meses de agosto a enero, año contra año",
  "bias.matchedTitle":
    "La verificación de estacionalidad refuerza el cambio en el patrón de reportes",
  "bias.encampmentRows": "Filas de campamentos",
  "bias.topLevelRequests": "Solicitudes de primer nivel",
  "bias.allGidRows": "Todas las filas de GID",
  "bias.encampmentShare": "Proporción de campamentos",
  "bias.uniqueParents": "Solicitudes padre únicas",
  "bias.placeboBasket": "Canasta placebo",
  "bias.preparedWindows": "Ventanas previa y posterior preparadas · julio de 2023 excluido",
  "bias.checkpointsEyebrow": "Puntos de control entre fuentes",
  "bias.checkpointsNote":
    "Reportes crudos por unidad del total publicado, no reportes por persona.",
  "bias.checkpointDetail": "{raw} reportes crudos / {published} unidades publicadas",
  "bias.duplicateShare": "Proporción de duplicados hijos {from} → {to}%",
  "bias.mobileShare": "Proporción de origen móvil {from} → {to}%",
  "bias.queryNote":
    "<c>comm_plan_name=DOWNTOWN</c> · <c>date_requested</c> · julio de 2023 excluido",
  "bias.neverUsedFor":
    "<b>Nunca se usa para:</b> la carga de planificación, la asignación del trabajo de calle, personas o movimiento, remoción de campamentos, respuesta de casos, efectos de intervención ni el pronóstico.",
  "bias.unavailable":
    "<b>El diagnóstico opcional de reportes no está disponible.</b> El artefacto cargado no contenía un diagnóstico validado completo, así que no se muestran valores parciales. Este carril sigue excluido del pronóstico y de la asignación.",
  "robust.eyebrow": "Explicaciones alternativas puestas a prueba",
  "robust.title": "Dos verificaciones descriptivas de sensibilidad",
  "robust.footfallEyebrow": "Sensibilidad al flujo peatonal",
  "robust.parkingTitle": "Aproximación por estacionamiento de pago",
  "robust.parkingMatched": "Los mismos seis meses calendario con un año de diferencia",
  "robust.parkingAligned": "Promedios de seis meses alineados · julio de 2023 excluido",
  "robust.verifiedPoles": "{poles} postes verificados históricamente",
  "robust.transactionsPerMonth": "transacciones / mes · {pct}%",
  "robust.allDowntownMeters": "Todos los parquímetros observados del centro",
  "robust.perMeterMonth": "Por parquímetro y mes",
  "robust.matchedCalendarSensitivity": "sensibilidad de calendario emparejado",
  "robust.allObservedMeters": "todos los parquímetros observados {pct}%",
  "robust.parkingCaveat":
    "Las transacciones no equivalen a personas ni a visitas. Siguen siendo posibles las tarifas, los horarios, el inventario, la sustitución de medios de pago, el estacionamiento gratuito, los eventos, el transporte, la economía y la estacionalidad; la zona de estacionamiento no es una coincidencia comprobada con el límite del GID.",
  "robust.countDayEyebrow": "Sensibilidad al día del conteo",
  "robust.weatherTitle": "El clima de la NOAA fue casi idéntico",
  "robust.tempF": "{value} °F",
  "robust.rainIn": "{value} pulgadas de lluvia",
  "robust.weatherCaveat":
    "{station}. Esto solo descarta un contraste evidente de lluvia o temperatura máxima el mismo día; las condiciones del aeropuerto y el clima previo pueden diferir.",
  "robust.unavailable":
    "Las verificaciones de explicaciones alternativas no están disponibles en este artefacto. Siguen excluidas del pronóstico y de la asignación.",

  /* ---- auditoría de digitalización de hojas de campo --------------- */
  "digit.eyebrow": "La regla de medir también se audita · visión por computadora",
  "digit.title": "Auditoría de digitalización de hojas de campo",
  "digit.engineLocal": "Motor: Apple Vision · sin conexión",
  "digit.engineVlm": "Motor: EyePop.ai VLM · alojado",
  "digit.engineOcr": "Motor: EyePop.ai OCR · alojado",
  "digit.intro":
    "Los conteos publicados se digitalizan a mano a partir de hojas de campo escaneadas y anotadas a mano. Esta auditoría recupera los totales escritos en las propias hojas del informe público de junio de 2026 fijado en el registro: por página, solo valores a escala de área; todo lo que esté a escala de cuadra se cuenta pero se retiene.",
  "digit.finding":
    "<b>Recuperado, mal leído y detectado:</b> la pasada de 200 DPI que se publica lee el total manuscrito de la hoja de City Center como 157 (página 4, más abajo); el mismo motor, con la imagen rasterizada de nuevo a 300 DPI, lee 152, que es lo que muestra la hoja. La hoja cuadra con el total de área publicado a través de los multiplicadores publicados: 152 + 14 × 1.75 = 176.5 ≈ 177. El reconocimiento de escritura a mano es inestable entre resoluciones de escaneo; sacar esa inestabilidad a la luz es el trabajo de esta auditoría, y por eso los valores recuperados son candidatos a verificación humana, nunca conteos.",
  "digit.perPage": "Recuperación por página en {pages} páginas",
  "digit.tableCaption":
    "Tokens enteros recuperados y valores a escala de área (≥{threshold}) por página",
  "digit.thPage": "Página",
  "digit.thIntegerTokens": "Tokens enteros",
  "digit.thAreaScaleValues": "Valores a escala de área",
  "digit.thWithheld": "Retenidos",
  "digit.valuesTruncated": "{values} … +{more} más",
  "digit.agreementEyebrow": "¿Coinciden dos lecturas? · verificación cruzada",
  "digit.agreementTitle": "Coincidencia entre lectura y lectura",
  "digit.runLabel": "{engine} · {dpi} DPI",
  "digit.engineAppleVision": "Apple Vision",
  "digit.agreementFinding":
    "Dos lecturas completas del mismo informe fijado —la pasada de 200 DPI que se publica y una nueva rasterización a 300 DPI— coinciden en {shared} de los {first} y {second} valores a escala de área que cada una recuperó ({pct}%). Las discrepancias son la lectura errónea de City Center de arriba más un puñado de diferencias de un solo token. El mismo motor leído dos veces es un piso de la inestabilidad de digitalización, no una segunda opinión independiente; la versión motor contra motor de esta tarjeta —Apple Vision frente al OCR alojado de EyePop o frente a su lectura VLM del contenido de la imagen— está a una ejecución de comparación de distancia en cuanto llegue una clave.",
  "digit.agreementPerPage": "Coincidencia por página en {pages} páginas",
  "digit.agreementTableCaption":
    "Valores recuperados por ambas lecturas, y por solo una, por página",
  "digit.thShared": "Compartidos",
  "digit.thOnlyFirst": "Solo 200 DPI",
  "digit.thOnlySecond": "Solo 300 DPI",
  "digit.auditBoundary":
    "Texto recuperado de un documento de conteo agregado ya publicado. Solo resultados por página: recuentos de tokens enteros y valores iguales o superiores al umbral del total de área. Sin identificadores de cuadra, sin geometría y sin valores por debajo del umbral; es una tarjeta de referencia para auditar el linaje de la digitalización, nunca una entrada de modelo.",
  "digit.agreementBoundary":
    "Resumen de coincidencia sobre dos tarjetas de auditoría de digitalización por página y filtradas por privacidad. Solo escribe valores que ya están presentes en una tarjeta filtrada; la coincidencia entre motores independientes es evidencia sobre el linaje de la digitalización, nunca una entrada de modelo.",
  "digit.swappable":
    "El motor de OCR es intercambiable; las capacidades alojadas de EyePop.ai son un reemplazo directo.",

  /* ---- sección 02 · pronóstico -------------------------------------- */
  "forecast.eyebrow": "Ensayo de pronóstico · muestra de método · solo se usan datos pasados",
  "forecast.title": "¿Podríamos haber predicho enero de 2026?",
  "forecast.intro":
    "Usando solo los datos disponibles en diciembre de 2025, la herramienta pronostica el mes siguiente y luego se califica contra sus propios errores pasados. El plan usa el extremo alto de ese rango de error, así que la incertidumbre compra cobertura adicional.",
  "forecast.rehearsalChip": "Un ensayo sobre datos pasados · no es un pronóstico en vivo",
  "forecast.bestGuess": "mejor estimación puntual",
  "forecast.likelyRange": "Rango probable, según errores pasados",
  "forecast.usesHighEnd": "el plan usa el extremo alto",
  "forecast.backtestEyebrow": "Retroprueba de origen móvil",
  "forecast.scorecardTitle": "Tabla de resultados de los modelos",
  "forecast.baselineRetained": "Se mantiene la línea base",
  "forecast.challengerPromoted": "Se promovió al retador",
  "forecast.modelRule":
    "Un candidato se promueve solo si mejora el error fuera de muestra en la ventana de promoción de 2023, que son las filas de la tabla de abajo. Las cifras de auditoría que están encima vienen de la evaluación caminando hacia adelante de 2025, separada e intacta, y por eso los dos niveles de error difieren. Un MAE y un WAPE más bajos son mejores; la cobertura del intervalo se audita aparte.",
  "forecast.auditAria": "Auditoría final caminando hacia adelante de 2025",
  "forecast.auditMae": "MAE de la auditoría 2025",
  "forecast.auditWape": "WAPE de la auditoría 2025",
  "forecast.intervalCoverage": "Cobertura del intervalo",
  "forecast.heldOutFolds": "{folds} pliegues fuera de muestra",
  "forecast.scorecardCaption": "Comparación de modelos de pronóstico con origen móvil",
  "forecast.thModel": "Modelo",
  "forecast.thMae2023": "MAE 2023",
  "forecast.thWape2023": "WAPE 2023",
  "forecast.thCoverage": "Cobertura",
  "forecast.selected": "Seleccionado",
  "forecast.noBlackBox": "Sin promoción de caja negra.",
  "forecast.noBlackBoxDetail":
    "La línea base estacional se mantiene salvo que un candidato gane fuera de muestra.",
  "forecast.viewValues": "Ver los valores del escenario y el método en formato accesible",
  "forecast.tableCaption":
    "Historia observada y escenario histórico de un paso adelante mostrados en la gráfica",
  "forecast.thPeriod": "Periodo",
  "forecast.thStatus": "Estado",
  "forecast.thValue": "Valor",
  "forecast.thLower": "Inferior",
  "forecast.thUpper": "Superior",
  "forecast.statusMissing": "Faltante",
  "forecast.statusObserved": "Observado",
  "forecast.statusScenario": "Escenario histórico",
  "forecast.trainingLabel": "Entrenamiento:",
  "forecast.trainingNote":
    "{window}. Evaluación con origen móvil; sin interpolación sobre los meses objetivo faltantes. Los datos están congelados en diciembre de 2025; el límite superior del escenario histórico alimenta únicamente esta asignación de demostración. La banda de residuos alcanzó una cobertura empírica del {coverage}% en {folds} pliegues; no es una garantía de probabilidad del 80%.",
  "chart.aria":
    "Escenario histórico de planificación de un paso adelante para {period}, con datos congelados en diciembre de 2025: punto {point}, con un intervalo de residuos de {lower} a {upper}.",
  "chart.title": "Escenario histórico de planificación de un paso adelante e intervalo de residuos",
  "chart.desc":
    "Historia mensual observada, con los periodos faltantes mostrados como huecos, seguida de un punto de escenario histórico y su intervalo de residuos.",
  "chart.pointMissing": "{period}: faltante",
  "chart.pointValue": "{period}: {value}",
  "chart.scenarioLabel": "escenario de {period}",
  "chart.scenarioValue": "{point} ({lower}–{upper})",
  "chart.notReported": "no reportado",
  "chart.rangeLabel": "rango {lower}–{upper}",
  "chart.legendObserved": "Observado",
  "chart.legendForecast": "Pronóstico (ensayo)",
  "chart.legendRange": "Rango probable, según errores pasados",

  /* ---- sección 03 · el plan ----------------------------------------- */
  "planner.eyebrow": "El plan de personal",
  "planner.title": "Planificar {hours} horas de personal",
  "planner.intro":
    "Reparta las horas entre {countedAreas}. Primero, cada área recibe un mínimo que usted elige, para que ningún lugar quede sin visita. Lo que quede va a donde el pronóstico espera más personas.",
  "planner.guaranteedMinimum": "Mínimo garantizado",
  "planner.guardOn": "ACTIVO · {floor} h por área",
  "planner.guardOff": "DESACTIVADO · SOLO COMPARACIÓN",
  "planner.infeasibleTitle": "No hay plan factible",
  "planner.infeasibleAdvice":
    "Aumente el presupuesto, quite un bloqueo o revise el mínimo de forma explícita.",
  "planner.mapHeading": "El plan sobre el mapa",
  "planner.mapLede":
    "Cada {areaNoun} conserva su mínimo garantizado; las horas adicionales van a donde el pronóstico espera más personas.",
  "planner.constraintCheck": "Verificación de restricciones",
  "planner.budgetConserved": "Presupuesto conservado exactamente",
  "planner.budgetMismatch": "Descuadre de presupuesto",
  "planner.unmetPlanningLoad": "Carga de planificación sin cubrir",
  "planner.unmetMoved": "{hours} h movidas a mínimos y bloqueos",
  "planner.unmetNone": "0 h · las horas siguen al pronóstico",
  "planner.floorCostEyebrow": "Costo del mínimo · supuesto",
  "planner.floorCostValue": "{cost} a una tarifa supuesta de {rate}",
  "planner.humanChanges": "Cambios humanos",
  "planner.lockedAssignments.one": "{count} asignación bloqueada",
  "planner.lockedAssignments.other": "{count} asignaciones bloqueadas",
  "planner.noneYet": "Ninguno todavía",
  "planner.recompute": "Recalcular las horas sin bloquear",

  /* ---- controles del planificador ------------------------------------ */
  "controls.floorAria": "Sensibilidad del mínimo de continuidad de cobertura",
  "controls.youSetThis": "Usted define esto · la herramienta nunca lo elige",
  "controls.floorTitle": "Horas mínimas garantizadas para cada {areaNoun}",
  "controls.floorHours": "{floor} h",
  "controls.floorNone": "sin mínimo",
  "controls.floorDefault": "predeterminado",
  "controls.floorCompare": "comparar",
  "controls.policyLensLabel": "Lente de política:",
  "controls.policyLensNoFloor":
    "<b>Lente de política:</b> sin mínimo, las horas siguen únicamente al pronóstico. Úselo para ver qué {areaNounPlural} quedarían casi sin nada; es una vista de comparación, no una recomendación.",
  "controls.policyLensWithFloor":
    "<b>Lente de política:</b> {setAside} de {budget} horas se apartan primero ({floor} por {areaNoun}); el resto sigue al pronóstico.",
  "controls.whatIfLabel": "Simulación · arrastre para poner a prueba el presupuesto",
  "controls.whatIfHours": "{hours} h",
  "controls.whatIfHelp":
    "Recalcula en vivo con los mismos mínimos y bloqueos. Observe el mapa y las barras; cuando el presupuesto no alcanza para los mínimos y los bloqueos, la herramienta lo dice en lugar de reparar el plan en silencio.",

  /* ---- banco de escenarios -------------------------------------------- */
  "bench.eyebrow": "Banco de escenarios · guardado solo en este navegador",
  "bench.save": "Guardar escenario",
  "bench.empty": "Guarde este plan, cambie la política y luego compare los dos lado a lado.",
  "bench.comparing": "Comparando",
  "bench.compare": "Comparar",
  "bench.delete": "Eliminar el escenario {name}",
  "bench.comparingWith":
    "Comparando con <b>{name}</b>: cada área muestra cuántas horas mueve el plan actual respecto de ese escenario.",
  "bench.infeasible":
    "<b>{name}</b> no es factible con los datos actuales, así que no se muestra ninguna comparación.",
  "bench.scenarioName": "{budget} h · mínimo de {floor} h",
  "bench.scenarioNameWithLocks.one": "{budget} h · mínimo de {floor} h · {count} bloqueo",
  "bench.scenarioNameWithLocks.other": "{budget} h · mínimo de {floor} h · {count} bloqueos",

  /* ---- inicio del planificador ----------------------------------------- */
  "start.available": "disponibles",
  "start.guaranteedMinimums": "mínimos garantizados",
  "start.followTheForecast": "siguen al pronóstico",
  "start.generate": "Generar escenario de cobertura",
  "start.budgetInvalid":
    "Escriba un número entero de horas entre {min} y {max} para generar un plan.",

  /* ---- filas del plan --------------------------------------------------- */
  "rows.allocated": "{allocated}/{budget} horas asignadas.",
  "rows.compareNoMinimum": "Comparar sin mínimo",
  "rows.restoreMinimum": "Restaurar el mínimo de {floor} h",
  "rows.resetLocks": "Restablecer bloqueos",
  "rows.auditBannerFloor":
    "<b>Vista de comparación, no una recomendación.</b> Sin un mínimo aplicado, las áreas por debajo de {floor} h perderían su visita garantizada.",
  "rows.auditBannerNoFloor":
    "<b>Vista de comparación, no una recomendación.</b> Esto muestra qué pasa sin mínimo garantizado: {someAreas} reciben casi nada.",
  "rows.assumptionBanner":
    "<b>Explorador de supuestos: se modela el despeje de {area}.</b> Según su supuesto, el {pct}% de su carga de planificación ({shifted}) pasa a áreas adyacentes y se supone que {resolved} queda resuelta; supuesto, no observado.{churn} Los conteos no pueden mostrar quién se mueve a dónde ni por qué, así que esto explora el supuesto que usted declaró; no es una predicción y no respalda la acción.",
  "rows.assumptionChurn": " El plan reasigna {hours} horas de personal en respuesta.",
  "rows.clearAssumption": "Quitar el supuesto",
  "rows.accuracyWarningWithAreas":
    "<b>Ilustrativo y solo para revisión humana.</b> El WAPE agregado de la auditoría es {wape}%. El WAPE fuera de muestra a nivel de área va de {min}% a {max}%; las áreas pequeñas son más ruidosas. El puntaje agregado no implica igual exactitud por área; la coordinación debe revisar cada asignación.",
  "rows.accuracyWarningNoAreas":
    "<b>Ilustrativo y solo para revisión humana.</b> El WAPE agregado de la auditoría es {wape}%. El WAPE fuera de muestra a nivel de área no está disponible en este artefacto. El puntaje agregado no implica igual exactitud por área; la coordinación debe revisar cada asignación.",
  "rows.listAria": "Asignación ilustrativa de horas de personal",
  "rows.planningFor": "Planificando para hasta {load} observaciones · {split}",
  "rows.splitLocked": "bloqueo humano en {hours} h",
  "rows.splitGuarded": "{floorHours} h de mínimo + {extraHours} h de la parte del pronóstico",
  "rows.splitUnguarded": "{hours} h de la parte del pronóstico, sin mínimo",
  "rows.movedAway": " · {hours} h desplazadas por el mínimo",
  "rows.hoursFor": "Horas para {area}",
  "rows.hourUnit": "h",
  "rows.lockAt": "Bloquear {area} en {hours} horas",
  "rows.locked": "Bloqueado",
  "rows.lock": "Bloquear",
  "rows.chipNoMinimum": "Sin mínimo",
  "rows.chipBelowMinimum": "Por debajo del mínimo",
  "rows.chipMinimumMet": "Mínimo de {floor} h cumplido",
  "rows.deltaUp": "+{hours} h frente al guardado",
  "rows.deltaDown": "{hours} h frente al guardado",
  "rows.deltaSame": "igual que el guardado",

  /* ---- explorador de supuestos ------------------------------------------ */
  "intervention.eyebrow": "Poner a prueba una acción · explorador de supuestos",
  "intervention.lede":
    "¿Y si se despejara {area}? Los conteos no pueden mostrar quién se mueve a dónde ni por qué, así que usted declara el supuesto y el plan muestra sus consecuencias. Despejar un área no agrega capacidad de refugio.",
  "intervention.shareLabel":
    "Proporción supuesta de su carga de planificación que pasa a áreas adyacentes en lugar de quedar resuelta",
  "intervention.clear": "Quitar el supuesto",
  "intervention.explore": "Explorar este supuesto",

  /* ---- supuesto de costo -------------------------------------------------- */
  "cost.rateAria": "Supuesto de tarifa horaria cargada",
  "cost.rateEyebrow": "Usted define esto · es un supuesto, no una tarifa medida",
  "cost.rateLabel": "Costo totalmente cargado supuesto de una hora de personal de trabajo de calle",
  "cost.perStaffHour": "{money} por hora de personal",
  "cost.rateBasis":
    "Sueldos, impuestos sobre la nómina, prestaciones, supervisión en campo y costo de vehículos, tal como los presupuesta su organización. Este proyecto no mide, no publica ni deriva esta tarifa; el valor inicial es un marcador de posición que su área de finanzas debe reemplazar antes de mostrarle cualquier cifra de abajo a quien toma decisiones. Deja fuera los fondos de asistencia directa, el gasto de capital y la administración indirecta de toda la organización. Mover este control cambia todas las cifras de costo y ningún plan.",
  "cost.floorSentenceNoHours":
    "El mínimo de equidad cuesta {money} y no movió ninguna hora fuera del área con mayor carga ({area}).",
  "cost.floorSentenceHours":
    "El mínimo de equidad cuesta {money} y movió {hours} horas fuera del área con mayor carga ({area}).",
  "cost.summaryGuarded":
    "Eso equivale a {hours} horas movidas en todo el plan por el mínimo garantizado, valuadas a la tarifa supuesta de {rate}.",
  "cost.summaryUnguarded":
    "El mínimo está apagado en esta vista de comparación, así que no mueve nada y no cuesta nada.",
  "cost.summaryTail":
    "El plan completo, de {hours} horas de personal, cuesta {total} a esa misma tarifa supuesta. La tarifa es un supuesto que define quien opera, no una cifra medida ni publicada, y no entra en ninguna asignación: el mismo plan se produce con cualquier tarifa. Los costos se expresan solo por hora de personal, por área y por plan; nunca por persona, por contacto ni por nadie atendido.",
  "cost.tableSummary": "Costo por barrio, a la tarifa supuesta",
  "cost.tableCaption":
    "Costo supuesto de las horas de personal planificadas. Horas × la tarifa supuesta, nada más.",
  "cost.thNeighborhood": "Barrio",
  "cost.thPlannedHours": "Horas planificadas",
  "cost.thAssumedCost": "Costo supuesto",
  "cost.wholePlan": "Plan completo",
  "cost.hoursValue": "{hours} h",

  /* ---- contexto de capacidad y el resumen de decisión --------------------- */
  "brief.capacitySummary": "Contexto de capacidad: las horas de personal en términos de dotación",
  "brief.capacityWeeks":
    "El presupuesto supuesto de {hours} horas equivale a {weeks} semanas de personal de cuarenta horas. Tanto el presupuesto como la semana de cuarenta horas usada para reexpresarlo son supuestos declarados, no datos de dotación de personal.",
  "brief.capacityHud":
    "Solo como referencia de escala: la guía de gestión de casos de HUD sugiere aproximadamente de 20 a 30 clientes por gestor de casos para acompañamiento orientado a vivienda, y de 10 a 12 para apoyo intensivo (HUD, Homeless System Response: Case Management Ratios, HUD Exchange). Esa guía describe la gestión de casos comunitaria, no el trabajo de calle; en la guía federal principal que revisamos no aparece ningún estándar de carga de casos para trabajo de calle, y HUD publica estas razones como ayuda de planificación, no como reglas obligatorias.",
  "brief.capacityLocal":
    "A nivel local: una entrega de registros públicos de la Ciudad de San Diego incluye una propuesta de albergue de Alpha Project de la época de 2023 que contrata gestión de casos a razón de una persona trabajadora por cada 15 adultos solos y una por cada 12.5 familias. Esas son razones de dotación propuestas para un albergue, no trabajo de calle y no práctica observada (entrega PRA de la Ciudad, fijada en el registro de fuentes).",
  "brief.capacityBoundary":
    "Estos puntos de referencia son contexto para una conversación sobre capacidad, nada más. Ningún número de referencia entra en la asignación, y nada de esto estima la necesidad de servicio, la elegibilidad ni la disponibilidad de ninguna persona.",
  "brief.portableEyebrow": "Salida portátil",
  "brief.portableLede":
    "Copia la asignación con la fuente, el modelo, las restricciones, las salvedades y los cambios humanos adjuntos.",
  "brief.copy": "Copiar el resumen de decisión",
  "brief.copied": "Resumen de decisión copiado, con supuestos y disparadores de revisión.",
  "brief.copyFailed":
    "El portapapeles no está disponible. El resumen completo está abierto abajo para copiarlo a mano.",
  "brief.full": "Resumen de decisión completo",

  /* ---- sección 04 · revisión ---------------------------------------------- */
  "review.eyebrow": "Usted decide",
  "review.title": "Revisar antes del próximo turno",
  "review.intro":
    "La herramienta redacta el plan con sus salvedades adjuntas. La coordinación decide qué cambia el contexto local.",
  "review.statusReady": "Listo para revisión de la coordinación",
  "review.statusComparison": "Vista de comparación · restaure un mínimo para continuar",
  "review.statusMismatch": "Descuadre de presupuesto · no se puede copiar",
  "review.statusDirty": "Recalcular los cambios humanos",
  "review.statusWaiting": "Esperando un plan factible",
  "review.whatChanged": "Qué cambió",
  "review.whatChangedValue": "Personas +{individuals}% · estructuras {structures}%",
  "review.whatMayBeHidden": "Qué puede estar oculto",
  "review.activeBlocks": "Cuadras activas +{change}",
  "review.activeBlocksWithHhi": "Cuadras activas +{change} · HHI +{hhi}%",
  "review.historicalRange": "Rango histórico de enero de 2026",
  "review.rangeValue": "{lower}–{upper}",
  "review.illustrativeCapacity": "Capacidad ilustrativa",
  "review.capacityValue": "{hours} horas de personal",
  "review.runPlanner": "Ejecutar el planificador",
  "review.coveragePolicy": "Política de continuidad de cobertura",
  "review.floorValue": "Mínimo de {floor} h por política de demostración",
  "review.noFloorValue": "Sin mínimo · solo comparación",
  "review.humanOverrides": "Anulaciones humanas",
  "review.none": "Ninguna",
  "review.triggersEyebrow": "Vuelva a revisar cuando",
  "review.triggerNewMonth": "Haya un mes nuevo",
  "review.triggerBudget": "Cambie el presupuesto",
  "review.triggerBoundary": "Cambien los límites",
  "review.triggerInterval": "Se ensanche el intervalo",
  "review.triggerFloor": "El mínimo no sea factible",
  "review.triggerLocal": "El conocimiento local contradiga el plan",
  "review.neverAuthorized":
    "<b>Nunca se autoriza:</b> el seguimiento de personas, las afirmaciones causales, la aplicación de la ley, las decisiones de elegibilidad ni el despacho automático.",
  "review.boundaryCard": "Tarjeta de límites",
  "review.modelCard": "Tarjeta del modelo",
  "review.claimLimits": "Límites de las afirmaciones",
  "review.limitation": "Limitación",

  /* ---- el mapa y sus equivalentes accesibles ------------------------------- */
  "map.ariaHours":
    "Mapa de {countedAreas} con las horas de personal planificadas; abra cada {areaNoun} para ver su detalle",
  "map.ariaChange":
    "Mapa de {countedAreas} con el cambio en las observaciones crudas de campo; abra cada {areaNoun} para ver su detalle",
  "map.ariaUnmet":
    "Mapa de {countedAreas} con la carga de planificación sin cubrir, en horas; abra cada {areaNoun} para ver su detalle",
  "map.areaValue": "{area}: {value}",
  "map.noData": "sin datos",
  "map.bay": "Bahía de San Diego",
  "map.freeway": "I-5",
  "map.legendAria": "Leyenda del mapa",
  "map.legendMore": "Más unidades observadas",
  "map.legendFewer": "Menos unidades observadas",
  "map.legendMissing": "Sin observación reciente",
  "map.captionChange":
    "Cambio en las observaciones crudas de campo por barrio · contornos esquemáticos, no límites cartografiados · solo valores agregados · no es un conteo de personas",
  "map.captionPlanned":
    "Horas de personal planificadas por barrio · contornos esquemáticos, no límites cartografiados",
  "map.captionBelowMinimum": " · el signo ! marca horas por debajo del mínimo",
  "map.captionAssumption": " · despeje modelado de {area} (supuesto)",
  "map.hoursValue": "{hours} h",
  "map.hoursBelowFloor": "{hours} h !",
  "table.viewAsTable": "Ver los valores del mapa como tabla",
  "table.thNeighborhood": "Barrio",
  "table.thValue": "Valor",
  "table.thState": "Estado",
  "table.captionChange": "Cambio en las observaciones crudas de campo por barrio",
  "table.captionPlanned": "Horas de personal planificadas por barrio",
  "table.captionObservedChange": "Cambio observado por barrio",
  "table.captionUnmet": "Carga de planificación sin cubrir por barrio",
  "state.noRecentObservation": "Sin observación reciente",
  "state.moreObservedUnits": "Más unidades observadas",
  "state.fewerObservedUnits": "Menos unidades observadas",
  "state.humanLock": "Bloqueo humano",
  "state.noMinimum": "Sin mínimo",
  "state.belowMinimum": "Por debajo del mínimo",
  "state.minimumMet": "Mínimo cumplido",
  "state.loadMovedByMinimums": "Carga movida por los mínimos",
  "state.followsForecast": "Sigue al pronóstico",

  /* ---- paneles de detalle por área ------------------------------------------ */
  "detail.emptyChange":
    "Seleccione un barrio —con un clic, o con Tab y Enter— para ver qué cambió ahí.",
  "detail.emptyPlan":
    "Seleccione un barrio en el mapa —con un clic, o con Tab y Enter— para inspeccionar su parte del plan o para poner a prueba una acción ahí.",
  "detail.emptyDossier": "Seleccione un barrio en el mapa para abrir su expediente.",
  "detail.kickerNeighborhood": "Detalle del barrio",
  "detail.kickerAllocation": "Detalle de la asignación",
  "detail.kickerDossier": "Expediente del área",
  "detail.noteChange":
    "Unidades crudas observadas sobre el panel fijo de comparación equivalente. Son valores agregados por área, no personas únicas; los componentes se digitalizaron de los mismos mapas.",
  "detail.observedChange": "Cambio observado",
  "detail.unitsDelta": "{delta} unidades",
  "detail.noRecentObservation": "sin observación reciente",
  "detail.hintSameBlocks": "enero de 2024 → enero de 2025, mismas cuadras",
  "detail.hintRawSameMonth": "observaciones crudas de campo, mismo mes",
  "detail.latestObservations": "Observaciones más recientes",
  "detail.latestCount": "Conteo más reciente",
  "detail.hintMonthlyStreetCount": "conteo mensual de calle más reciente",
  "detail.hintLatestMonthly": "observación mensual más reciente",
  "detail.planningLoad": "Carga de planificación",
  "detail.hintUpperForecastBound": "límite superior del pronóstico",
  "detail.hintAdjustedByAssumption": "ajustada por el supuesto activo",
  "detail.hintWeightsRemaining": "pondera las horas restantes",
  "detail.plannedHours": "Horas planificadas",
  "detail.hintHumanLockEditAbove": "bloqueo humano: edítelo en la lista de arriba",
  "detail.hintRecomputeUpdates": "se actualiza al recalcular",
  "detail.hintHumanLock": "bloqueo humano",
  "detail.hintMinimumGuaranteed": "mínimo garantizado de {floor} h",
  "detail.hintNoMinimumEnforced": "sin mínimo aplicado",
  "detail.coverageFloor": "Mínimo de cobertura",
  "detail.floorValue": "mínimo de {floor} h",
  "detail.floorOff": "apagado: solo auditoría",
  "detail.hintUserSetFloor": "mínimo de continuidad definido por usted",
  "detail.unmetLoad": "Carga sin cubrir",
  "detail.hintMovedByMinimums": "horas movidas por mínimos y bloqueos",
  "detail.heldOutWape": "WAPE fuera de muestra",
  "detail.notAudited": "sin auditar",
  "detail.wapeValue": "{wape}%",
  "detail.hintNoisyCaution": "ruidoso: tómelo con cautela",
  "detail.hintNoisyReview": "ruidoso: requiere revisión humana",
  "detail.hint2025Audit": "auditoría fuera de muestra de 2025",
  "detail.vsSavedScenario": "Frente al escenario guardado",
  "detail.same": "igual",
  "detail.deltaHours": "{delta} h",
  "detail.hintVsPinned": "plan actual menos el escenario fijado",

  /* ---- mapa de trabajo -------------------------------------------------------- */
  "workspace.stageAria": "Escenario del mapa del plan",
  "workspace.layerAria": "Capa del mapa",
  "workspace.layerHours": "Horas planificadas",
  "workspace.layerChange": "Cambio observado",
  "workspace.layerUnmet": "Carga sin cubrir",
  "workspace.captionHours": "Horas de personal planificadas por barrio",
  "workspace.captionChange":
    "Cambio en las observaciones crudas de campo, comparación más reciente del mismo mes",
  "workspace.captionUnmet": "Horas que los mínimos apartaron del reparto por pronóstico",
  "workspace.captionTail":
    " · contornos esquemáticos, no límites cartografiados · no es un conteo de personas",
  "workspace.inspectorAria": "Inspector",
  "workspace.tabsAria": "Secciones del inspector",
  "workspace.tabPlan": "Plan",
  "workspace.tabArea": "Área",
  "workspace.tabScenarios": "Escenarios",
  "workspace.tabBrief": "Resumen",

  /* ---- estado del plan en vivo ------------------------------------------------- */
  "state.liveAria": "Estado del plan en vivo",
  "state.allocated": "{allocated}/{budget} h asignadas",
  "state.floor": "mínimo de {floor} h",
  "state.noMinimumShort": "sin mínimo",
  "state.unmet": "{hours} h de carga sin cubrir",
  "state.noUnmet": "0 h sin cubrir",
  "state.locks.one": "{count} bloqueo",
  "state.locks.other": "{count} bloqueos",
  "state.assumption": "supuesto: despeje de {area}",

  /* ---- procedencia de la geografía ---------------------------------------------- */
  "geo.summary": "Cómo se definen {theseAreas}",
  "geo.resolved": "{count} dentro del alcance · procedencia resuelta",
  "geo.unresolved": "{count} dentro del alcance · {unresolved} de 3 componentes sin resolver",
  "geo.unobserved":
    "El artefacto cargado no trae ninguna observación para {areas}. Esas áreas reciben el mínimo garantizado y ningún peso del pronóstico, y las secciones de evidencia y pronóstico describen la geografía propia del artefacto, no esta.",
  "geo.source":
    "Lista de áreas {version}, tomada del perfil de la organización <c>{profileId}</c>. Cada número de operación de esta página —presupuesto, mínimo, reserva de continuidad, incremento de asignación, número de equipos y la tarifa horaria supuesta— viene de ese archivo.",
  "geo.componentAreaList": "Lista de áreas",
  "geo.componentBoundaries": "Límites",
  "geo.componentAdjacency": "Adyacencia",
  "geo.statusResolved": "resuelto",
  "geo.statusProvisional": "provisional",
  "geo.statusUnresolved": "sin fuente citable",

  /* ---- las palabras del perfil para sus propios lugares -------------------------
   *
   * El sustantivo de lugar es dato del perfil, no texto de la interfaz, así que
   * cada uno trae todas las formas gramaticales que el español flexiona y el
   * inglés no. Ningún mensaje arma una frase nominal juntando artículo y palabra.
   */
  "places.serviceArea": "área de servicio",
  "places.serviceArea.plural": "áreas de servicio",
  "places.serviceArea.a": "un área de servicio",
  "places.serviceArea.some": "algunas áreas de servicio",
  "places.serviceArea.these": "estas áreas de servicio",
  "places.serviceArea.counted": "las {count} áreas de servicio",
  "places.serviceArea.everyOneOf": "Cada una de las {count} áreas de servicio",
  "places.neighborhood": "barrio",
  "places.neighborhood.plural": "barrios",
  "places.neighborhood.a": "un barrio",
  "places.neighborhood.some": "algunos barrios",
  "places.neighborhood.these": "estos barrios",
  "places.neighborhood.counted": "los {count} barrios",
  "places.neighborhood.everyOneOf": "Cada uno de los {count} barrios",
  "places.township": "municipio",
  "places.township.plural": "municipios",
  "places.township.a": "un municipio",
  "places.township.some": "algunos municipios",
  "places.township.these": "estos municipios",
  "places.township.counted": "los {count} municipios",
  "places.township.everyOneOf": "Cada uno de los {count} municipios",
  "places.district": "distrito",
  "places.district.plural": "distritos",
  "places.district.a": "un distrito",
  "places.district.some": "algunos distritos",
  "places.district.these": "estos distritos",
  "places.district.counted": "los {count} distritos",
  "places.district.everyOneOf": "Cada uno de los {count} distritos",
  "places.borough": "demarcación",
  "places.borough.plural": "demarcaciones",
  "places.borough.a": "una demarcación",
  "places.borough.some": "algunas demarcaciones",
  "places.borough.these": "estas demarcaciones",
  "places.borough.counted": "las {count} demarcaciones",
  "places.borough.everyOneOf": "Cada una de las {count} demarcaciones",
  "places.precinct": "sector",
  "places.precinct.plural": "sectores",
  "places.precinct.a": "un sector",
  "places.precinct.some": "algunos sectores",
  "places.precinct.these": "estos sectores",
  "places.precinct.counted": "los {count} sectores",
  "places.precinct.everyOneOf": "Cada uno de los {count} sectores",
  "places.corridor": "corredor",
  "places.corridor.plural": "corredores",
  "places.corridor.a": "un corredor",
  "places.corridor.some": "algunos corredores",
  "places.corridor.these": "estos corredores",
  "places.corridor.counted": "los {count} corredores",
  "places.corridor.everyOneOf": "Cada uno de los {count} corredores",
  "places.area": "área",
  "places.area.plural": "áreas",
  "places.area.a": "un área",
  "places.area.some": "algunas áreas",
  "places.area.these": "estas áreas",
  "places.area.counted": "las {count} áreas",
  "places.area.everyOneOf": "Cada una de las {count} áreas",
  "count.0": "cero",
  "count.1": "uno",
  "count.2": "dos",
  "count.3": "tres",
  "count.4": "cuatro",
  "count.5": "cinco",
  "count.6": "seis",
  "count.7": "siete",
  "count.8": "ocho",
  "count.9": "nueve",
  "count.10": "diez",
  "count.11": "once",
  "count.12": "doce",

  /* ---- recorrido guiado ---------------------------------------------------- */
  "guide.stepCount": "Paso {step} de {total} · teclas ← → · Esc detiene",
  "guide.done": "Listo: presione Siguiente para continuar.",
  "guide.yourTurn": "Su turno:",
  "guide.stop": "Detener",
  "guide.pause": "Pausar",
  "guide.play": "Reproducir",
  "guide.back": "Atrás",
  "guide.finish": "Terminar",
  "guide.doItForMe": "Hazlo por mí",
  "guide.next": "Siguiente",
  "guide.revealTitle": "Empiece por la pregunta",
  "guide.revealTask": "Presione “Poner a prueba la caída”.",
  "guide.revealBody":
    "La pregunta real de quien coordina: la estimación principal bajó, ¿eso es buena noticia? Abra la evidencia detrás de la caída antes de tomarla como respuesta.",
  "guide.evidenceTitle": "Lea qué se movió de verdad",
  "guide.evidenceBody":
    "Las partes se movieron en direcciones opuestas: las personas observadas subieron de {indFrom} a {indTo} (+{indPct}%) mientras las carpas y estructuras bajaron de {strFrom} a {strTo}.",
  "guide.evidenceBlocks":
    " Se vieron personas en más lugares, no en menos: las cuadras con al menos una persona observada pasaron de {from} a {to}.",
  "guide.evidenceTail":
    " Lo que bajó fueron las carpas. Un tablero convencional reporta dónde subió o bajó un conteo; esta herramienta comprueba si cambió la propia regla de medir antes de que alguien actúe.",
  "guide.forecastTitle": "Un ensayo de pronóstico, no una profecía",
  "guide.forecastBody":
    "Todo aquí está congelado en diciembre de 2025. Tres modelos simples compiten sobre meses fuera de muestra que van avanzando, y el ganador proyecta {point} para {period} con una banda histórica de residuos al 80% de {lower} a {upper}. Esa banda cubrió solo el {coverage}% de las comprobaciones pasadas; la falla queda a la vista en lugar de convertirse en confianza falsa.",
  "guide.generateTitle": "El plan ya está sobre la mesa",
  "guide.generateBody":
    "La herramienta abrió con el trabajo empezado: {budget} horas de personal supuestas ya están repartidas entre {countedAreas}; cada área conserva el mínimo garantizado que usted fije y el resto sigue a donde se esperan más personas. Cambie el presupuesto o el mínimo y se recalcula al instante. Propone; nunca despacha.",
  "guide.compareTitle": "Vea qué protege el mínimo",
  "guide.compareTask": "Elija el mínimo de “0 h · sin mínimo”.",
  "guide.compareBody":
    "Sin mínimo, las horas siguen únicamente al pronóstico y {someAreas} quedan casi sin nada. Esa vista es una auditoría del compromiso, nunca una recomendación.",
  "guide.restoreTitle": "Nunca deje encendida la vista de auditoría",
  "guide.restoreTask": "Elija el mínimo de “{floor} h · predeterminado” para restaurarlo.",
  "guide.restoreBody":
    "Restaurar el mínimo garantiza que cada {areaNoun} conserve una visita. El mínimo es una política visible que usted eligió, no algo que el modelo aprendió.",
  "guide.lockTitle": "Anúlelo como lo haría quien coordina",
  "guide.lockTask":
    "Bloquee {aArea} (pruebe con {area}) y luego presione “Recalcular las horas sin bloquear”.",
  "guide.lockBody":
    "El conocimiento local pesa más que el modelo. Una línea bloqueada se conserva exactamente y se declara en el resumen; recalcular reequilibra solo las horas sin bloquear y nunca repara su decisión en silencio.",
  "guide.exploreTitle": "Ponga a prueba la acción obvia",
  "guide.exploreTask":
    "Seleccione {aArea} en el mapa del plan y luego presione “Explorar este supuesto”.",
  "guide.exploreBody":
    "La acción a la que más se recurre es despejar un área. Aquí la audita con honestidad: usted declara cuánta de la carga de esa área pasa al área vecina en lugar de quedar resuelta, y el plan reacciona. Ningún ajuste hace la necesidad más pequeña sin suponerlo abiertamente; los datos no pueden mostrar quién se mueve a dónde, y esta herramienta se niega a fingir lo contrario.",
  "guide.auditTitle": "La regla de medir también se audita",
  "guide.auditBody":
    "Hasta el instrumento de medición se revisa: la visión por computadora lee las hojas de campo escaneadas que están detrás de los conteos publicados —totalmente sin conexión— y detecta sus propios errores. Leído a una resolución de escaneo, el total manuscrito de City Center sale 157; leído a otra, 152, que es lo que muestra la hoja, y 152 más 14 carpas por 1.75 da 176.5, publicado como 177. Dos lecturas completas coinciden en el 97.5 por ciento de los valores recuperados; la diferencia es la propia barra de error del instrumento, mostrada en lugar de escondida. El motor de OCR es intercambiable, así que las capacidades alojadas de EyePop entran con una sola bandera. Visión que audita el instrumento, nunca a las personas.",
  "guide.briefTitle": "Váyase con el resumen",
  "guide.briefTask": "Presione “Copiar el resumen de decisión”.",
  "guide.briefBody":
    "El resumen lleva la evidencia, la incertidumbre, los ajustes de política, sus anulaciones y cualquier supuesto que haya explorado. Sin inicio de sesión, sin API en vivo, sin modelo a nivel de persona y sin ningún modelo de lenguaje detrás de ninguna cifra. Solo lugares agregados: nada de esto rastrea personas, infiere movimiento ni envía personal automáticamente. Usted decide qué regla de medir gobierna el próximo turno.",
  "guide.firstArea": "la primera área",

  /* ---- el enlace que entrega un plan a un colega ------------------------------- */
  "link.eyebrow": "Enviar este plan",
  "link.lede":
    "El plan entero viaja en el enlace: las horas que usted fijó, el mínimo garantizado, cada bloqueo humano y los dos supuestos que declaró. No se guarda nada en ningún lado, y el enlace lleva únicamente nombres de barrio y cantidades de horas: sin registros, sin ubicaciones, nada sobre ninguna persona.",
  "link.copy": "Copiar el enlace a este plan",
  "link.readBeforeSending": "Léalo antes de enviarlo",
  "link.copied":
    "Enlace copiado. Al abrirlo se reconstruye este plan exactamente, sin cuenta y sin servidor.",
  "link.copyFailed":
    "El portapapeles no está disponible. Seleccione el enlace de abajo y cópielo a mano.",

  /* ---- exportaciones ------------------------------------------------------------ */
  "export.eyebrow": "Llévelo con usted",
  "export.lede":
    "La hoja de cálculo y el plan impreso llevan la razón de cada hora, palabra por palabra. La hoja de turno es la versión de bolsillo: barrios, horas, razones y lo que esto no es.",
  "export.csv": "Descargar hoja de cálculo (CSV)",
  "export.print": "Imprimir el plan / guardar como PDF",
  "export.csvSaved":
    "Hoja de cálculo guardada. Cada fila lleva la razón de sus horas y los límites de este plan.",
  "export.csvBlocked":
    "Este navegador bloqueó la descarga. Use Imprimir o copie el resumen de decisión.",
  "export.printOpened":
    "Se abrió el diálogo de impresión. Elija Guardar como PDF para conservar el plan, sus razones y el resumen en un solo archivo.",
  "export.printBlocked":
    "Este navegador bloqueó la impresión. Use la hoja de cálculo o copie el resumen de decisión.",
  "export.disclosureLine":
    "Apoyo de planificación para revisión humana. Solo asigna tiempo de personal: no autoriza la aplicación de la ley, no rastrea personas, no establece causas y no decide quién es elegible para ningún servicio.",
  "print.title": "Still Here SD · plan de cobertura",
  "print.metaFloor":
    "{budget} horas de personal · mínimo garantizado de {floor} h por barrio · {allocated} de {budget} horas asignadas",
  "print.metaNoFloor":
    "{budget} horas de personal · sin mínimo garantizado (vista de comparación) · {allocated} de {budget} horas asignadas",
  "print.source": "{label} · {artifact} · datos de origen hasta {date}.",
  "print.tableCaption": "Horas de personal planificadas por barrio, con la razón de cada cantidad.",
  "print.thNeighborhood": "Barrio",
  "print.thPlannedHours": "Horas de personal planificadas",
  "print.thWhy": "Por qué esta cantidad",
  "print.thSetByPerson": "Fijado por una persona",
  "print.thMovedByMinimum": "Horas desplazadas por el mínimo",
  "print.allNeighborhoods": "Todos los barrios",
  "print.totalReason":
    "suma de las filas de arriba, frente a las {budget} horas de personal que usted fijó",
  "print.yes": "sí",
  "print.no": "no",
  "print.briefHeading": "Resumen de decisión",
  "csv.colNeighborhood": "barrio",
  "csv.colPlannedStaffHours": "horas_de_personal_planificadas",
  "csv.colWhyThisAmount": "por_que_esta_cantidad",
  "csv.colSetByAPerson": "fijado_por_una_persona",
  "csv.colGuaranteedMinimumHours": "horas_de_minimo_garantizado",
  "csv.colMovedByMinimumHours": "horas_de_carga_desplazadas_por_el_minimo",
  "csv.colLimits": "limites",

  /* ---- hoja de turno ------------------------------------------------------------- */
  "sheet.open": "Abrir la hoja de turno",
  "sheet.close": "Cerrar",
  "sheet.print": "Imprimir / guardar como PDF",
  "sheet.title": "Hoja de turno",
  "sheet.metaFloor": "{budget} horas de personal · mínimo garantizado de {floor} h por barrio",
  "sheet.metaNoFloor": "{budget} horas de personal · sin mínimo garantizado (vista de comparación)",
  "sheet.draftNote":
    "Borrador para revisión de la coordinación. Nadie es despachado a partir de esto.",
  "sheet.hours": "{hours} h",
  "sheet.whyLabel": "Por qué esta cantidad:",
  "sheet.setByPerson": "Fijado por una persona",
  "sheet.belowMinimum": "Por debajo del mínimo",
  "sheet.minimumMet": "Mínimo de {floor} h cumplido",
  "sheet.movedAway": "{hours} h desplazadas por el mínimo",
  "sheet.allNeighborhoods": "Todos los barrios",
  "sheet.total": "{allocated} / {budget} h",
  "sheet.assumption":
    "Estas horas incluyen un supuesto que usted declaró: se modela el despeje de {area}, con el {pct}% de su carga de planificación que se supone que pasa a áreas adyacentes. Supuesto, no observado.",
  "sheet.source":
    "{label} · {artifact} · datos de origen hasta {date}. Solo evidencia agregada a nivel de lugar: sin registros por cuadra, sin geometría a nivel de cuadra y sin datos a nivel de persona.",

  /* ---- el resumen de decisión ------------------------------------------------------ */
  "decision.heading": "STILL HERE SD · RESUMEN DE DECISIÓN PARA EL PRÓXIMO TURNO",
  "decision.statusReady":
    "Estado: LISTO PARA REVISIÓN DE LA COORDINACIÓN — no es despacho automático",
  "decision.statusProvisional":
    "Estado: INSTANTÁNEA PROVISIONAL SIN CONEXIÓN — no es despacho automático",
  "decision.sourceGenerated":
    "Fuente: {label}. Artefacto: {artifact}; datos de origen hasta {date}; análisis generado.",
  "decision.sourceEmbedded":
    "Fuente: {label}. Artefacto: {artifact}; datos de origen hasta {date}; respaldo sin conexión incluido en el paquete.",
  "decision.method":
    "Método: comparación del mismo mes sobre el panel fijo de {panel} cuadras bajo el método POST2020; los componentes del mapa de cuadras son observaciones digitalizadas por separado, no personas únicas.",
  "decision.evidence":
    "Evidencia: {classification}. De {fromPeriod} a {toPeriod}: personas observadas {indFrom} → {indTo} (+{indPct}%); carpas y estructuras {strFrom} → {strTo} ({strPct}%).{thresholds} El índice de unidades mezcladas es secundario, no un conteo de personas.{hhi}",
  "decision.evidenceThresholds":
    " Cuadras con ≥1 persona observada {oneFrom} → {oneTo}; cuadras con ≥2 {twoFrom} → {twoTo}.",
  "decision.evidenceActiveBlocks":
    " Cuadras activas de componentes mezclados {from} → {to} (+{pct}%).",
  "decision.evidenceHhi": " El HHI de personas quedó casi sin cambio ({from} → {to}).",
  "decision.classificationWiderFootprint": "Huella más amplia de personas observadas",
  "decision.forecast":
    "Escenario histórico de planificación de un paso adelante (datos congelados en diciembre de 2025): {period} {point}; intervalo histórico de residuos al 80% de {lower} a {upper}. {model}; MAE con origen móvil {mae}; cobertura empírica {coverage}% en {folds} pliegues. No es un pronóstico futuro en vivo ni un intervalo de probabilidad garantizado.",
  "decision.scenarioGuardOn":
    "Escenario ilustrativo de continuidad de cobertura para revisión humana: {budget} horas de personal; resguardo definido por la persona usuaria activo (mínimo de {floor} h por política de demostración). {rows}.{audit}",
  "decision.scenarioGuardOff":
    "Escenario ilustrativo de continuidad de cobertura para revisión humana: {budget} horas de personal; resguardo definido por la persona usuaria apagado, solo auditoría. {rows}.{audit}",
  "decision.scenarioRow": "{area}: {hours} h",
  "decision.scenarioRowLocked": "{area}: {hours} h (bloqueo humano)",
  "decision.scenarioRowNoHours": "{area}: — h",
  "decision.scenarioRowNoHoursLocked": "{area}: — h (bloqueo humano)",
  "decision.auditRange":
    " Los pronósticos por área son más ruidosos que el agregado (el WAPE fuera de muestra va de {min}% a {max}%).",
  "decision.auditUnavailable":
    " El WAPE de auditoría a nivel de área no está disponible en este artefacto; no deduzca igual exactitud.",
  "decision.assumption":
    "Supuesto de prueba de estrés activo: se modela el despeje de {area}, con el {pct}% de su carga de planificación que se supone que pasa a áreas adyacentes ({shifted} desplazada, {resolved} supuestamente resuelta). Es un supuesto explorado para revisión, no una predicción: los datos de origen no pueden verificar el desplazamiento (Auditoría de la Ciudad, abril de 2026).",
  "decision.cost":
    "Vista de costo — supuesto definido por quien opera, no una cifra medida ni publicada: a una tarifa supuesta de {rate}, las {hours} horas de personal del plan cuestan {total}.{floorLine} La tarifa la fija la organización que opera, no se deriva de ninguna fuente de este artefacto y no entra en ninguna asignación: se producen planes idénticos con cualquier tarifa. Los costos se expresan solo por hora de personal, por área y por plan; nada de esto es un costo por persona, por contacto ni por nadie atendido.",
  "decision.costFloor":
    " {sentence} Eso equivale a {hours} horas movidas en todo el plan por el mínimo garantizado, valuadas a la misma tarifa supuesta.",
  "decision.triggers":
    "Disparadores de revisión: mes nuevo, cambio de presupuesto o de límites, intervalo más ancho, mínimo no factible o contradicción con el conocimiento local.",
  "decision.privacy":
    "Límite de privacidad y de autorización: solo evidencia agregada a nivel de lugar; no se distribuyen registros por cuadra ni geometría a nivel de cuadra (el mapa dibuja contornos esquemáticos, no límites cartografiados). Esto no rastrea personas, no establece causalidad, no autoriza la aplicación de la ley y no despacha personal automáticamente.",

  /* ---- mensajes del planificador, traducidos en la frontera de presentación --------- */
  "planText.everyAreaKeeps": "{everyOneOf} conserva al menos {floor} horas.",
  "planText.noMinimum": "Sin mínimo aplicado: las horas siguen únicamente al pronóstico.",
  "planText.budgetNotWhole":
    "El presupuesto de horas de personal debe ser un número entero no negativo.",
  "planText.floorNotWhole":
    "El mínimo de continuidad de cobertura debe ser un número entero no negativo.",
  "planText.lockBelowFloor":
    "Las horas bloqueadas deben ser números enteros iguales o superiores al mínimo de {floor} horas.",
  "planText.lockNotWhole": "Las horas bloqueadas deben ser números enteros no negativos.",
  "planText.infeasibleFloors":
    "No hay plan factible: los bloqueos y los mínimos de cobertura requieren {required} horas, pero el presupuesto es de {budget}.",
  "planText.infeasibleAllLocked.one":
    "No hay plan factible: todas las áreas están bloqueadas y queda {count} hora sin asignar. Desbloquee un área o haga que los bloqueos sumen el presupuesto.",
  "planText.infeasibleAllLocked.other":
    "No hay plan factible: todas las áreas están bloqueadas y quedan {count} horas sin asignar. Desbloquee un área o haga que los bloqueos sumen el presupuesto.",
  "planText.infeasibleShort": "No hay plan factible: se asignaron {allocated} de {budget} horas.",
  "reason.floorPlusShare":
    "Mínimo de continuidad de cobertura de {floor} h definido por la persona usuaria, más una parte proporcional de las horas restantes según la carga de planificación que incorpora la incertidumbre.",
  "reason.upperBoundPlusFloor": "límite superior del pronóstico + mínimo de cobertura de {floor} h",
  "reason.upperBoundPlusFloorUnstated": "límite superior del pronóstico + mínimo de cobertura",
  "reason.coverageFloorOnly":
    "El artefacto cargado no trae ninguna observación para esta área. Recibe el mínimo garantizado y ningún peso del pronóstico.",

  /* ---- tokens del artefacto -------------------------------------------------------- */
  "token.demo_v1_training": "entrenamiento de demo v1",
  "token.demo_v1_forecast_selection": "selección de modelo de pronóstico de demo v1",
  "token.demo_v1_planner": "planificador de demo v1",
  "token.estimated_person_equivalents": "equivalentes de persona estimados",
  "token.area_total": "total del área",
  "token.publisher_reported": "reportado por la fuente",

  /* ---- panel del planificador autónomo ---------------------------------------------- */
  "panel.title": "3. Planificar {hours}",
  "panel.errorTitle": "3. Planificar el próximo turno",
  "panel.cannotProduce": "✕ No se puede producir este plan.",
  "panel.budgetLabel": "Horas de personal disponibles",
  "panel.budgetEmpty": "Escriba el número de horas de personal disponibles.",
  "panel.budgetNegative": "Las horas disponibles no pueden ser negativas.",
  "panel.budgetErrorTail": "El plan de abajo sigue reflejando {hours}.",
  "panel.guardLine":
    "Resguardo de cobertura: ACTIVO · Mínimo de {floor} por área incluida · {count} áreas incluidas",
  "panel.noPlanProduced":
    "✕ No se produjo ningún plan. El mínimo de cobertura no se bajó para que cupiera en el presupuesto.",
  "panel.floorDominant":
    "⚠ El mínimo de cobertura, y no el pronóstico, está decidiendo la mayor parte de este plan. Solo {discretionary} de {budget} se distribuye por carga relativa. Lea el reparto como cobertura, no como un orden de necesidad.",
  "panel.tableCaption":
    "Horas sugeridas por área, ordenadas por nombre de área. Esta tabla muestra un plan de cobertura. No establece un orden de prioridad.",
  "panel.thArea": "Área",
  "panel.thSuggested": "Sugeridas",
  "panel.thSetByCoordinator": "Fijado por la coordinación",
  "panel.thUnguarded": "Sin el resguardo (vista de auditoría)",
  "panel.thWhy": "¿Por qué esta cantidad?",
  "panel.movedAway": "({hours} desplazadas por el mínimo)",
  "panel.lockLabel": "Bloquear {area}",
  "panel.lockedLabel": "Bloqueado {area}",
  "panel.hoursFor": "Horas para {area}",
  "panel.whyButton": "¿Por qué esta cantidad?",
  "panel.allocatedLine": "Asignadas {allocated} de {budget} ·",
  "panel.unmetLine": "Carga de planificación sin cubrir {hours}",
  "panel.roundingResidue": " · {hours} sin asignar por redondeo",
  "panel.coordinatorSet":
    "✎ {locked} de {total} asignaciones fueron fijadas por la coordinación y se conservaron al recalcular.",
  "panel.hideGuardColumn": "Ocultar la vista sin el resguardo de cobertura",
  "panel.showGuardColumn": "Comparar sin el resguardo de cobertura",
  "panel.reset": "Restablecer",
  "panel.unguardedNote":
    "La columna sin resguardo es una vista de auditoría que muestra qué daría un reparto puramente proporcional. Se muestra solo como comparación.",
  "panel.hoursUnit": "{hours} h",

  /* ---- estado vacío de horas entregadas ---------------------------------------------- */
  "actuals.title": "Todavía no se han registrado horas entregadas",
  "actuals.defaultMeasure": "contactos o encuentros",
  "actuals.defaultWho": "La organización que opera",
  "actuals.lede":
    "Aquí no falta nada ni hay nada roto. Nadie ha reportado horas entregadas a esta instalación, así que no hay nada que mostrar; y un mes vacío no es un mes con cero trabajo de calle.",
  "actuals.wouldSupply": "{who} entregaría, una vez al mes, una fila por área de planificación:",
  "actuals.plannedHours": "Horas planificadas",
  "actuals.plannedHoursText": "las horas de personal que el plan pidió para esa área.",
  "actuals.deliveredHours": "Horas entregadas",
  "actuals.deliveredHoursText":
    "las horas de personal realmente trabajadas ahí. Cero es una respuesta real y la que más vale la pena registrar con honestidad.",
  "actuals.engagementCount": "Un conteo de encuentros",
  "actuals.engagementCountText":
    "{measure}, en la unidad que la organización ya cuenta. Un número de encuentros, nunca una lista de personas. Los conteos de uno a cuatro se retienen bajo la misma regla de celda pequeña que rige a todos los demás números de aquí, y aparecen como retenidos en lugar de como cero.",
  "actuals.format":
    "El formato es un solo archivo JSON validado contra <c>config/schema/actuals.v1.schema.json</c>, con grano de área y mes. Los nombres, las fechas de nacimiento, los identificadores de cliente o de caso, las exportaciones de gestión de casos, las direcciones, las coordenadas y cualquier fila por persona o por encuentro se rechazan en la importación: esta herramienta no tiene ningún concepto de persona como entidad y no es el lugar para construirlo.",
  "actuals.instructions":
    "Las instrucciones completas, incluido lo que se calculará y lo que no se calculará más adelante a partir de estos números, están en <c>{docs}</c>.",

  /* ---- el plan frente a lo entregado --------------------------------------------------- */
  "actuals.compare.eyebrow": "El mes pasado",
  "actuals.compare.title": "El plan frente a lo entregado",
  "actuals.compare.intro":
    "Un plan dice cuántas horas de personal recibirá cada área. Un archivo de horas entregadas dice cuántas se trabajaron allí. La distancia entre ambas es el error del propio plan, área por área.",

  "actuals.compare.loadLabel": "Cargar un archivo de horas entregadas",
  "actuals.compare.loadHint":
    "El archivo se lee aquí, en este navegador, y se queda en él. No se sube nada: no hay ningún servidor detrás de esta página al que subirlo.",
  "actuals.compare.storedNote": "Guardado solo en este navegador, hasta que lo quite.",
  "actuals.compare.clear": "Quitar estas horas entregadas",
  "actuals.compare.monthLabel": "Mes",

  "actuals.compare.reportedBy": "Reportado por {role} en {who}. Última actualización: {date}.",
  "actuals.compare.method": "Cómo se recogieron las cifras: {method}",
  "actuals.compare.measure": "{label} — {definition}",

  "actuals.compare.colArea": "Área",
  "actuals.compare.colPlanned": "Horas planificadas",
  "actuals.compare.colDelivered": "Horas entregadas",
  "actuals.compare.colError": "Error del plan",
  "actuals.compare.colEngagement": "{measure}",
  "actuals.compare.tableCaption":
    "Horas de personal planificadas y entregadas por área, para {month}",

  "actuals.compare.plannedNone": "Sin plan registrado",
  "actuals.compare.errorUnresolved": "Sin resolver: no hay plan con el que comparar",
  "actuals.compare.errorUnder": "{hours} h por debajo del plan",
  "actuals.compare.errorOver": "{hours} h por encima del plan",
  "actuals.compare.errorOnPlan": "Igual al plan",
  "actuals.compare.engagementSuppressed": "Retenido: son muy pocos para publicarlo",
  "actuals.compare.engagementNotRecorded": "No registrado",

  "actuals.compare.absentTitle": "No reportaron ninguna fila para {month}",
  "actuals.compare.absentBody":
    "{areas}. Un mes ausente del archivo es desconocido, no cero: no se ha demostrado que allí no se entregara nada.",

  "actuals.compare.noTotal": "Por qué no hay un total",
  "actuals.compare.noTotalBody":
    "Una suma entre áreas o entre meses permitiría a un lector restar hasta recuperar un conteo que este archivo retiene, así que la fila de área y mes sigue siendo el grano publicado. Lea las filas; no las sume.",

  "actuals.compare.notScorableTitle": "Lo que esta comparación no es",
  "actuals.compare.notScorableCountForecast":
    "No es una calificación del pronóstico publicado. Ese pronóstico anticipa un conteo observado con la metodología de punto en el tiempo, y ninguna cifra de un archivo de horas entregadas observa un conteo de ese tipo.",
  "actuals.compare.notScorableEngagementResponse":
    "No es evidencia de que las horas muevan un conteo de encuentros. Dos cifras en una misma fila no establecen que una haya producido la otra, y la propia lista de exclusiones del archivo descarta esa pregunta.",
  "actuals.compare.notScorableAreaChange":
    "No es una lectura de cómo cambió un área. Nada en un archivo de horas entregadas observa un área entre un plan y el siguiente, así que ningún cambio así puede recuperarse de él.",

  "actuals.compare.refusedTitle": "Este archivo fue rechazado",
  "actuals.compare.refusedIntro":
    "No se cargó nada. Cada hallazgo nombra el campo del que proviene, para que se corrija en el archivo en vez de adivinarlo.",
  "actuals.compare.warningsTitle": "Cargado, con advertencias",
  "actuals.compare.warningsIntro":
    "Estas no bloquean el archivo. Son cifras que conviene revisar antes de leer la comparación.",
  /* ---- tarjetas de datos responsables -------------------------------------------------- */
  "cards.hideDetails": "Ocultar los detalles de {title}",
  "cards.showDetails": "Mostrar los detalles de {title}",
  "cards.noteLabel": "Nota.",
  "cards.suppression":
    "<b>◇ Algunos conteos están retenidos.</b> Se retienen {cells} valores y {rows} meses completos porque quedan por debajo de {threshold}. Un conteo retenido no es cero. Significa que se observaron muy pocas personas como para publicar el número sin identificar a alguien.",
  "cards.aiTitle": "Cómo se produjo esto",
  "cards.aiBody":
    "Ningún modelo generativo determina el resultado de la evidencia, el pronóstico ni la asignación. Los tres son reglas deterministas, y las mismas entradas producen la misma salida en cada ejecución.",
  "cards.aiUses":
    "Se usó un modelo generativo para lo siguiente, revisado en cada caso por una persona:",

  /* ---- recursos de accesibilidad de la revisión WCAG 2.1 AA ------------- */
  "app.skipToMain": "Saltar al contenido principal",
  /** La frase que toda leyenda del mapa debe llevar. Véase `map.outlinePhrase` en `en.ts`. */
  "map.outlinePhrase": "contornos esquemáticos, no límites cartografiados",
  "map.provenance":
    "Estos son contornos esquemáticos, no límites cartografiados. La entidad publicadora nombra sus áreas pero no publica ningún archivo de límites; estas formas se derivaron de una cuadrícula privada que este proyecto no puede fijar con una suma de verificación ni volver a obtener, y el despliegue marca sus fuentes de límites y de adyacencia como no resueltas. Léalas como un diagrama de qué área es cuál, y nunca como dónde termina un área.",
  "guide.stepAnnounce": "Paso {step} de {total}: {title}",
} as const;
