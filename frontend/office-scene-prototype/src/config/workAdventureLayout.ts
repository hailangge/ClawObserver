export type WorkAdventureMarkerKind = "fixed" | "overflow";
export type WorkAdventureNameplateSide = "below" | "above";

export type WorkAdventureRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type WorkAdventureMarker = {
  left: number;
  top: number;
  zoneId: string;
  labelOffsetX: number;
  hangerOffsetX: number;
  markerKind: WorkAdventureMarkerKind;
  nameplateSide?: WorkAdventureNameplateSide;
};

export const WORKADVENTURE_VISIBLE_LOUNGE_RECT: WorkAdventureRect = {
  left: 0.67,
  top: 0.59,
  width: 0.28,
  height: 0.27,
};

export const WORKADVENTURE_REST_SAFE_RECT: WorkAdventureRect = {
  left: 0.701,
  top: 0.648,
  width: 0.209,
  height: 0.132,
};

export const WORKADVENTURE_WORK_ZONE_IDS = ["desk-bay-west", "desk-bay-east", "central-hotline"] as const;
export const WORKADVENTURE_REST_ZONE_IDS = ["lounge-silent-zone"] as const;

export const WORKADVENTURE_FIXED_DESK_MARKERS: readonly WorkAdventureMarker[] = [
  { left: 0.15, top: 0.274, zoneId: "desk-bay-west", labelOffsetX: -2, hangerOffsetX: -4, markerKind: "fixed" },
  { left: 0.255, top: 0.274, zoneId: "desk-bay-west", labelOffsetX: 2, hangerOffsetX: 4, markerKind: "fixed" },
  { left: 0.36, top: 0.274, zoneId: "desk-bay-west", labelOffsetX: -2, hangerOffsetX: -4, markerKind: "fixed" },
  { left: 0.455, top: 0.274, zoneId: "desk-bay-west", labelOffsetX: 2, hangerOffsetX: 4, markerKind: "fixed" },
  { left: 0.565, top: 0.258, zoneId: "desk-bay-east", labelOffsetX: -2, hangerOffsetX: -4, markerKind: "fixed" },
  { left: 0.675, top: 0.258, zoneId: "desk-bay-east", labelOffsetX: 2, hangerOffsetX: 4, markerKind: "fixed" },
  { left: 0.235, top: 0.556, zoneId: "central-hotline", labelOffsetX: -6, hangerOffsetX: -6, markerKind: "fixed" },
  { left: 0.34, top: 0.556, zoneId: "central-hotline", labelOffsetX: 4, hangerOffsetX: 6, markerKind: "fixed" },
  { left: 0.445, top: 0.556, zoneId: "central-hotline", labelOffsetX: -4, hangerOffsetX: -6, markerKind: "fixed" },
  { left: 0.55, top: 0.556, zoneId: "central-hotline", labelOffsetX: 4, hangerOffsetX: 6, markerKind: "fixed" },
  { left: 0.655, top: 0.556, zoneId: "central-hotline", labelOffsetX: -4, hangerOffsetX: -6, markerKind: "fixed" },
  { left: 0.755, top: 0.556, zoneId: "central-hotline", labelOffsetX: 4, hangerOffsetX: 6, markerKind: "fixed" },
] as const;

export const WORKADVENTURE_FIXED_LOUNGE_MARKERS: readonly WorkAdventureMarker[] = [
  { left: 0.706, top: 0.652, zoneId: "lounge-silent-zone", labelOffsetX: 0, hangerOffsetX: 0, markerKind: "fixed", nameplateSide: "below" },
  { left: 0.774, top: 0.652, zoneId: "lounge-silent-zone", labelOffsetX: 0, hangerOffsetX: 0, markerKind: "fixed", nameplateSide: "below" },
  { left: 0.842, top: 0.652, zoneId: "lounge-silent-zone", labelOffsetX: 0, hangerOffsetX: 0, markerKind: "fixed", nameplateSide: "below" },
  { left: 0.91, top: 0.652, zoneId: "lounge-silent-zone", labelOffsetX: 0, hangerOffsetX: 0, markerKind: "fixed", nameplateSide: "below" },
] as const;
