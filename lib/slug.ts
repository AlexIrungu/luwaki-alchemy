/**
 * A slug is a URL forever — once a design is published and shared, changing it
 * breaks links. Generated once at creation, then editable only while the
 * design is still unpublished.
 */
export const slugify = (input: string) =>
  input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
