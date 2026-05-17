/* ============================================================ *
 * StrengthsImprovements — file-tree style two-column section.
 * strengths/ in green, improvements/ in terracotta. Pre + box-
 * drawing characters: ├─ └─.
 * ============================================================ */

interface StrengthsImprovementsProps {
  strengths: string[];
  improvements: string[];
}

function padIndex(i: number): string {
  return String(i + 1).padStart(2, "0");
}

interface TreeListProps {
  items: string[];
  color: "green" | "terracotta";
  heading: string;
}

function TreeList({ items, color, heading }: TreeListProps) {
  const headingClass = color === "green" ? "text-accent" : "text-accent2";
  const indexClass = color === "green" ? "text-accent" : "text-accent2";

  return (
    <div>
      <div className="mb-5 text-[14px]">
        <span className="text-dim">## </span>
        <span className="font-medium">{heading}</span>
      </div>
      <pre className="m-0 whitespace-pre-wrap text-[13px] leading-[2.05] text-muted">
        <span className={headingClass}>{heading}/</span>
        {"\n"}
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const branch = isLast ? "└─" : "├─";
          return (
            <span key={i}>
              <span className="text-dim">{branch}</span>{" "}
              <span className={indexClass}>{padIndex(i)}</span>{"  "}
              {item}
              {"\n"}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

export function StrengthsImprovements({
  strengths,
  improvements,
}: StrengthsImprovementsProps) {
  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
      <TreeList items={strengths} color="green" heading="strengths" />
      <TreeList items={improvements} color="terracotta" heading="improvements" />
    </div>
  );
}

export default StrengthsImprovements;
