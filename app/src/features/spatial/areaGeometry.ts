// Simplified boundary polygons of the six downtown neighborhoods (San Diego Bay
// to the southwest, I-5 past the northeast corner), derived by dissolving the
// organizer block grid to area level on a block-pitch cell grid
// (scripts/gen_area_outlines.py) and expressed in viewBox units. Deliberately
// aggregate: area values only, no block geometry or precise observation
// locations ship with the app.
export const AREA_MAP_GEOMETRY: Record<
  string,
  { outline: string; label: { x: number; y: number } }
> = {
  city_center: {
    outline:
      "M103.8,40.5 L109.5,40.5 L109.5,34.8 L115.2,34.8 L115.2,69.2 L109.5,69.2 L109.5,75.0 L98.0,75.0 L98.0,69.2 L92.2,69.2 L92.2,75.0 L80.8,75.0 L80.8,69.2 L75.0,69.2 L75.0,63.5 L69.2,63.5 L69.2,69.2 L63.5,69.2 L63.5,80.8 L69.2,80.8 L69.2,86.5 L52.0,86.5 L52.0,92.2 L46.2,92.2 L46.2,80.8 L40.5,80.8 L40.5,46.2 L103.8,46.2 Z",
    label: { x: 78, y: 56 },
  },
  columbia: {
    outline: "M6.0,69.2 L6.0,34.8 L40.5,34.8 L40.5,69.2 Z",
    label: { x: 23.2, y: 50 },
  },
  cortez: {
    outline:
      "M40.5,46.2 L40.5,6.0 L52.0,6.0 L52.0,11.8 L103.8,11.8 L103.8,34.8 L109.5,34.8 L109.5,40.5 L103.8,40.5 L103.8,46.2 Z",
    label: { x: 74, y: 26 },
  },
  east_village: {
    outline:
      "M75.0,144.0 L75.0,138.2 L80.8,138.2 L80.8,75.0 L92.2,75.0 L92.2,69.2 L98.0,69.2 L98.0,75.0 L109.5,75.0 L109.5,69.2 L115.2,69.2 L115.2,57.8 L149.8,57.8 L149.8,144.0 Z",
    label: { x: 115, y: 100 },
  },
  gaslamp: {
    outline:
      "M63.5,80.8 L63.5,69.2 L69.2,69.2 L69.2,63.5 L75.0,63.5 L75.0,69.2 L80.8,69.2 L80.8,138.2 L69.2,138.2 L69.2,109.5 L63.5,109.5 L63.5,86.5 L69.2,86.5 L69.2,80.8 Z",
    label: { x: 72, y: 96 },
  },
  marina: {
    outline:
      "M6.0,69.2 L40.5,69.2 L40.5,80.8 L46.2,80.8 L46.2,92.2 L52.0,92.2 L52.0,86.5 L63.5,86.5 L63.5,109.5 L69.2,109.5 L69.2,132.5 L46.2,132.5 L46.2,115.2 L23.2,115.2 L23.2,103.8 L17.5,103.8 L17.5,98.0 L6.0,98.0 Z",
    label: { x: 32, y: 92 },
  },
};
