/**
 * Category-specific vocabulary. The database stays generic (see
 * `supabase/migrations/0001_core_schema.sql`); this file is where the
 * knowledge that "the launch category is nails" is allowed to live.
 */

export const SHAPES = ["cubic", "square", "stiletto", "coffin", "oval"] as const;
export type Shape = (typeof SHAPES)[number];

export const HANDS = ["left", "right"] as const;
export type Hand = (typeof HANDS)[number];

export const FINGERS = ["thumb", "index", "middle", "ring", "pinky"] as const;
export type Finger = (typeof FINGERS)[number];

export type Slot = { hand: Hand; finger: Finger };

/** The ten slots, in the order they are drawn: left pinky → right pinky. */
export const SLOTS: Slot[] = [
  ...[...FINGERS].reverse().map((finger) => ({ hand: "left" as const, finger })),
  ...FINGERS.map((finger) => ({ hand: "right" as const, finger })),
];

export const slotKey = ({ hand, finger }: Slot) => `${hand}-${finger}`;

export const slotLabel = ({ hand, finger }: Slot) =>
  `${hand === "left" ? "L" : "R"} ${finger}`;

export const COLLECTION_ORDER = ["sublime", "opulence", "noir"] as const;
export type CollectionSlug = (typeof COLLECTION_ORDER)[number];

/** The verb that fronts each collection block on the homepage. */
export const COLLECTION_VERB: Record<CollectionSlug, string> = {
  sublime: "DREAM",
  opulence: "EMBODY",
  noir: "CONJURE",
};
