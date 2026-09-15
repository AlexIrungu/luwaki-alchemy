import Image from "next/image";
import { Placeholder } from "@/components/ui/Section";
import { PLATFORM_LABEL, SOCIAL_POSTS, SOCIAL_PROFILES, type SocialPlatform } from "@/lib/social";

export function SocialFeed() {
  if (SOCIAL_POSTS.length === 0) {
    return (
      <Placeholder
        phase={1}
        title="Social media"
        brief="Horizontal scroll of the strongest Instagram and TikTok posts. Built — waiting on the handles and a pick of posts (lib/social.ts)."
      />
    );
  }

  const profiles = (Object.entries(SOCIAL_PROFILES) as [SocialPlatform, string | null][]).filter(
    (entry): entry is [SocialPlatform, string] => Boolean(entry[1]),
  );

  return (
    <section className="border-y border-line-soft py-24">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-6">
        <h2 className="font-display text-4xl tracking-[0.2em]">FOLLOW THE WORK</h2>
        {profiles.length > 0 && (
          <nav className="flex gap-6 font-mono text-[11px] tracking-[0.2em] text-ink-dim">
            {profiles.map(([platform, href]) => (
              <a
                key={platform}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-ink"
              >
                {PLATFORM_LABEL[platform]} ↗
              </a>
            ))}
          </nav>
        )}
      </div>

      <ul className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-6 px-6 pb-4">
        {SOCIAL_POSTS.map((post) => (
          <li key={post.href} className="w-64 shrink-0 snap-start md:w-72">
            <a href={post.href} target="_blank" rel="noopener noreferrer" className="group block">
              <div className="relative aspect-[9/16] overflow-hidden border border-line bg-panel">
                <Image
                  src={post.image}
                  alt={post.caption}
                  fill
                  sizes="(min-width: 768px) 18rem, 16rem"
                  className="object-cover transition-opacity group-hover:opacity-80"
                />
              </div>
              <p className="mt-3 font-mono text-[10px] tracking-[0.25em] text-ink-faint">
                {PLATFORM_LABEL[post.platform]}
              </p>
              <p className="mt-1 text-sm text-ink-dim">{post.caption}</p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
