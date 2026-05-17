/* ============================================================ *
 * ResourcesList — recommended reading section.
 * Terminal style: ❯ open {url} + → {reason}.
 * search: URLs → Google search links (logic preserved).
 * ============================================================ */

import type { RecommendedResource } from "@/types";

interface ResourcesListProps {
  resources: RecommendedResource[];
}

function resolveUrl(url: string): string {
  if (url.startsWith("search:")) {
    const topic = url.slice("search:".length).trim();
    return `https://www.google.com/search?q=${encodeURIComponent(topic)}`;
  }
  return url;
}

export function ResourcesList({ resources }: ResourcesListProps) {
  if (!resources.length) return null;

  return (
    <div>
      <div className="mb-6 text-[14px]">
        <span className="text-dim">## </span>
        <span className="font-medium">recommended-reading</span>
      </div>
      <div className="space-y-5 text-[13px]">
        {resources.map((r, i) => (
          <div key={i}>
            <div className="break-all text-paper">
              <span className="text-accent2">❯ open </span>
              <a
                href={resolveUrl(r.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-accent"
              >
                {r.url}
              </a>
            </div>
            <div className="pl-5 text-[12.5px] text-muted">
              → {r.reason}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResourcesList;
