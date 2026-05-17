/* ============================================================ *
 * Verdict — terminal-native verdict block.
 * Prompt line + TerminalWindow with editorial italic text.
 * ============================================================ */

import TerminalWindow from "@/components/shared/TerminalWindow";
import Prompt from "@/components/shared/Prompt";

interface VerdictProps {
  verdict: string;
}

export function Verdict({ verdict }: VerdictProps) {
  return (
    <div>
      <div className="mb-5">
        <Prompt accent="muted">verdict</Prompt>
      </div>
      <TerminalWindow title="assessment">
        <p
          className="editorial leading-[1.55]"
          style={{ fontSize: "clamp(16px, 2vw, 20px)" }}
        >
          {verdict}
        </p>
      </TerminalWindow>
    </div>
  );
}

export default Verdict;
