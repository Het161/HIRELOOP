"use client";

import { AnimatePresence, motion } from "framer-motion";
import TerminalWindow from "@/components/shared/TerminalWindow";
import AsciiButton from "@/components/shared/AsciiButton";

interface EndInterviewDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function EndInterviewDialog({
  open,
  onConfirm,
  onCancel,
}: EndInterviewDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/85 px-4"
          onClick={onCancel}
        >
          <motion.div
            key="dialog"
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <TerminalWindow title="confirm" className="bg-surface">
              <div className="text-[13px]">
                <div className="mb-2 text-paper">
                  <span className="text-accent2">❯</span> end the interview?
                </div>
                <div className="mb-6 leading-relaxed text-muted">
                  we&apos;ll score everything you&apos;ve answered so far and
                  generate your debrief. this can&apos;t be undone.
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <AsciiButton sound="secondary" onClick={onCancel}>
                    keep going
                  </AsciiButton>
                  <AsciiButton
                    variant="danger"
                    sound="danger"
                    onClick={onConfirm}
                  >
                    end &amp; get report
                  </AsciiButton>
                </div>
              </div>
            </TerminalWindow>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
