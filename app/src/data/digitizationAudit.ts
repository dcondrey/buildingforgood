// Generated from data/monitoring/digitization_audit.json (do not edit by hand;
// re-run stillhere_pipeline.eyepop_audit and copy the result).
export interface AuditPage {
  page: number;
  integer_tokens: number;
  values: number[];
  withheld_below_threshold: number;
}

export interface DigitizationAudit {
  kind: string;
  status: string;
  engine: string;
  source_pdf: string;
  value_threshold: number;
  pages: AuditPage[];
  boundary: string;
}

export const DIGITIZATION_AUDIT: DigitizationAudit = {
  boundary:
    "Text recovered from an already-published aggregate count document. Page-level results only: integer-token counts and values at or above the area-total threshold. No block identifiers, no geometry, no sub-threshold values; a reference card for auditing the digitization lineage, never a model input.",
  engine: "local",
  kind: "digitization_audit",
  pages: [
    {
      integer_tokens: 290,
      page: 1,
      values: [
        13, 14, 14, 16, 17, 17, 17, 19, 21, 22, 23, 24, 24, 27, 29, 29, 30, 31, 32, 32, 33, 34, 37,
        37, 38, 39, 40, 40, 40, 41, 41, 42, 42, 43, 43, 44, 45, 47, 47, 48, 48, 49, 49, 50, 50, 52,
        53, 54, 56, 57, 58, 59, 60, 60, 61, 61, 63, 63, 64, 65, 68, 69, 73, 74, 75, 75, 76, 77, 77,
        77, 82, 83, 84, 84, 86, 96, 100, 101, 104, 111, 111, 114, 119, 121, 124, 125, 129, 132, 133,
        141, 147, 148, 154, 158, 161, 176, 177, 179, 193, 194, 195, 196, 202, 209, 215, 232, 238,
        248, 253, 262, 264, 297, 304, 311, 313, 401, 405, 405, 408, 409, 413, 434, 435, 445, 453,
        485, 486, 502, 513, 514, 529, 538, 543, 545, 555, 555, 559, 568, 569, 571, 581, 582, 585,
        593, 595, 597, 606, 614, 622, 623, 627, 629, 630, 634, 636, 639, 644, 656, 657, 662, 667,
        672, 672, 677, 678, 679, 685, 695, 714, 714, 717, 719, 720, 721, 721, 725, 732, 744, 744,
        756, 759, 765, 770, 776, 787, 789, 791, 799, 799, 800, 800, 804, 806, 809, 809, 810, 811,
        812, 821, 826, 838, 841, 842, 843, 843, 843, 844, 845, 846, 847, 856, 860, 862, 865, 868,
        875, 875, 880, 882, 884, 887, 887, 892, 898, 902, 904, 926, 941, 946, 955, 961, 961, 964,
        980, 984, 986, 995, 1004, 1012, 1019, 1024, 1026, 1027, 1058, 1063, 1073, 1092, 1100, 1105,
        1140, 1148, 1156, 1156, 1157, 1160, 1162, 1172, 1253, 1253, 1286, 1294, 1324, 1335, 1370,
        1384, 1386, 1409, 1415, 1444, 1453, 1474, 1515, 1556, 1565, 1609, 1622, 1660, 1706, 1718,
        1723, 1810, 1839, 1939, 2025, 2026, 2104,
      ],
      withheld_below_threshold: 4,
    },
    {
      integer_tokens: 9,
      page: 2,
      values: [19],
      withheld_below_threshold: 8,
    },
    {
      integer_tokens: 7,
      page: 3,
      values: [28, 91],
      withheld_below_threshold: 5,
    },
    {
      integer_tokens: 6,
      page: 4,
      values: [14, 157],
      withheld_below_threshold: 4,
    },
    {
      integer_tokens: 1,
      page: 5,
      values: [50],
      withheld_below_threshold: 0,
    },
    {
      integer_tokens: 8,
      page: 6,
      values: [48],
      withheld_below_threshold: 7,
    },
    {
      integer_tokens: 1,
      page: 7,
      values: [],
      withheld_below_threshold: 1,
    },
    {
      integer_tokens: 2,
      page: 8,
      values: [],
      withheld_below_threshold: 2,
    },
    {
      integer_tokens: 1,
      page: 9,
      values: [15],
      withheld_below_threshold: 0,
    },
    {
      integer_tokens: 0,
      page: 10,
      values: [],
      withheld_below_threshold: 0,
    },
    {
      integer_tokens: 6,
      page: 11,
      values: [24, 42, 261],
      withheld_below_threshold: 3,
    },
  ],
  source_pdf: "data/raw/dsdp_public_reports/June-2026-Unsheltered-Sleep-Count.pdf",
  status: "experimental",
  value_threshold: 12,
};
