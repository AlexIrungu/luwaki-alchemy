/**
 * The home page SOCIAL MEDIA section (site map item 8): a horizontal scroll of
 * the strongest Instagram and TikTok posts.
 *
 * Curated by hand rather than pulled from the platform APIs. Both need an
 * app review and a token that expires, and the brief asks for the *best*
 * posts — a choice, not a live feed. Thumbnails go in `public/social/`.
 *
 * Empty until Lucy sends the handles and her pick of posts; the section keeps
 * rendering its Phase 1 placeholder until then.
 */

export type SocialPlatform = "instagram" | "tiktok";

export type SocialPost = {
  platform: SocialPlatform;
  /** Link to the post itself. */
  href: string;
  /** Portrait thumbnail in `public/social/`, e.g. "/social/dragon-scale-reel.jpg". */
  image: string;
  /** Short line shown under the thumbnail, and the image alt text. */
  caption: string;
};

export const SOCIAL_PROFILES: Record<SocialPlatform, string | null> = {
  instagram: null,
  tiktok: null,
};

export const SOCIAL_POSTS: SocialPost[] = [];

export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: "INSTAGRAM",
  tiktok: "TIKTOK",
};
