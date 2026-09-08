"use client";

import { useEffect, useRef, useState } from "react";
import { DemoFrame } from "./DemoFrame";
import { accent, status } from "./palette";

/**
 * The human-in-the-loop gate, and what sits behind it.
 *
 * Two things this demonstrates that prose cannot: an irreversible action stops
 * and waits for a person, and the thing it is about to change is a plain-text
 * file whose change can be read as a diff before it happens. Approving commits
 * it; rejecting writes nothing.
 *
 * Notes, balances and commit hashes are invented.
 */

type DiffLine = { kind: "context" | "add" | "remove"; text: string };

type Request = {
  id: string;
  prompt: string;
  lane: "memory" | "finance" | "calendar";
  reversible: boolean;
  intent: string;
  target: string;
  diff: DiffLine[];
  commit: string;
  /** Shown when the gate is skipped because nothing irreversible happens. */
  readOnlyAnswer?: string;
};

const REQUESTS: Request[] = [
  {
    id: "bill",
    prompt: "Log the electricity bill I just paid, 214,300 pesos.",
    lane: "finance",
    reversible: false,
    intent: "Append a transaction and update the running balance",
    target: "09-FINANCE/2026-09-movimientos.md",
    diff: [
      { kind: "context", text: "| 2026-09-02 | Arriendo          | -1,850,000 |" },
      { kind: "context", text: "| 2026-09-04 | Mercado           |   -186,400 |" },
      { kind: "add", text: "| 2026-09-06 | Energía (CHEC)    |   -214,300 |" },
      { kind: "context", text: "" },
      { kind: "remove", text: "**Saldo del mes:** -2,036,400" },
      { kind: "add", text: "**Saldo del mes:** -2,250,700" },
    ],
    commit: "a7f3c91",
  },
  {
    id: "note",
    prompt: "Remember that the Vercel hobby plan has no card and cannot be billed.",
    lane: "memory",
    reversible: false,
    intent: "Create a note and link it from the index",
    target: "07-KNOWLEDGE/vercel-hobby-limits.md",
    diff: [
      { kind: "add", text: "---" },
      { kind: "add", text: "title: Vercel Hobby, sin tarjeta y sin cobro posible" },
      { kind: "add", text: "status: vivo" },
      { kind: "add", text: "updated: 2026-09-06" },
      { kind: "add", text: "type: referencia" },
      { kind: "add", text: "---" },
      { kind: "add", text: "" },
      { kind: "add", text: "Sin método de pago la cuenta no puede facturar: al tocar" },
      { kind: "add", text: "un límite el plan frena, no cobra. Ver [[portafolio]]." },
    ],
    commit: "1c04ee8",
  },
  {
    id: "read",
    prompt: "What did I decide about the graph retrieval layer?",
    lane: "memory",
    reversible: true,
    intent: "Read three notes from the vault",
    target: "nothing is written",
    diff: [],
    commit: "",
    readOnlyAnswer:
      "You dropped it. You ran it head to head against plain grep on twenty real queries, both scored 20/20, the graph contributed nothing, and BM25 missed literal strings that grep found. The decision is in the product-direction note, dated 25 August.",
  },
];

const laneColor = {
  memory: "#6480F0",
  finance: "#D95926",
  calendar: "#199E70",
} as const;

type Phase = "idle" | "thinking" | "awaiting" | "approved" | "rejected" | "answered";

export function CortanaDemo() {
  // Opens on the gated request, already waiting for approval: the gate is the
  // point of the project and an empty pane does not make it.
  const [request, setRequest] = useState<Request | null>(REQUESTS[0]);
  const [phase, setPhase] = useState<Phase>("awaiting");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const send = (r: Request) => {
    if (timer.current) clearTimeout(timer.current);
    setRequest(r);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const settle = () => setPhase(r.reversible ? "answered" : "awaiting");
    if (reduced) {
      settle();
      return;
    }
    setPhase("thinking");
    timer.current = setTimeout(settle, 900);
  };

  return (
    <DemoFrame
      title="Cortana, the human-in-the-loop gate"
      subtitle="cortana-app · demo build"
      note="The real assistant runs over Telegram against a Git-versioned Markdown vault, with Postgres for transactional state. The notes, balances and commit hashes below are invented, and nothing is written anywhere."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="min-w-0">
          <p
            className="font-mono text-[0.6875rem] tracking-[0.14em] uppercase"
            style={accent.fg}
          >
            Say something to it
          </p>
          <ul className="mt-3 space-y-2">
            {REQUESTS.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => send(r)}
                  style={accent.chip(request?.id === r.id ? 18 : 6, request?.id === r.id ? 100 : 40)}
                  className="w-full rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-all hover:-translate-y-px hover:brightness-125"
                >
                  {r.prompt}
                  <span className="mt-1 block font-mono text-[0.625rem] text-fg-3">
                    {r.reversible ? "read · no gate" : "write · gated"}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-lg border border-line bg-surface-2/40 p-4">
            <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-fg-3 uppercase">
              Where the line is drawn
            </p>
            <p className="mt-2.5 text-xs leading-relaxed text-fg-3">
              Reversibility, not importance. Reads pass straight through. Anything that cannot be
              undone easily, such as a financial record, a sent message or a cancelled event, stops
              here and waits for me, whatever it is worth.
            </p>
          </div>
        </div>

        <div className="min-h-80 rounded-lg border border-line bg-surface-2/40 p-4 sm:p-5">
          {!request && (
            <p className="text-sm leading-relaxed text-fg-3">
              Pick one of the three on the left. Two of them want to write to the vault, so they
              will stop and show you the exact change before anything happens. The third only
              reads, so it does not.
            </p>
          )}

          {request && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[0.625rem] uppercase"
                  style={{
                    borderColor: `${laneColor[request.lane]}66`,
                    color: laneColor[request.lane],
                  }}
                >
                  {request.lane} lane
                </span>
                <span className="font-mono text-[0.625rem] text-fg-3">{request.intent}</span>
              </div>

              {phase === "thinking" && (
                <p className="flex items-center gap-2 text-sm text-fg-3">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet" />
                  Working…
                </p>
              )}

              {phase === "answered" && request.readOnlyAnswer && (
                <>
                  <p className="rounded-2xl rounded-bl-sm bg-surface px-4 py-3 text-sm leading-relaxed text-fg-2">
                    {request.readOnlyAnswer}
                  </p>
                  <p className="font-mono text-[0.6875rem]" style={{ color: status.good }}>
                    No gate. Nothing was written.
                  </p>
                </>
              )}

              {(phase === "awaiting" || phase === "approved" || phase === "rejected") && (
                <>
                  <div className="rounded-lg border border-violet/40 bg-violet/8">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet/25 px-3.5 py-2.5">
                      <span className="font-mono text-[0.6875rem] tracking-[0.1em] text-violet uppercase">
                        Approval required
                      </span>
                      <span className="truncate font-mono text-[0.625rem] text-fg-3">
                        {request.target}
                      </span>
                    </div>
                    <pre className="max-h-56 overflow-auto px-3.5 py-3 font-mono text-[0.6875rem] leading-relaxed">
                      {request.diff.map((line, i) => (
                        <div
                          key={i}
                          style={{
                            color:
                              line.kind === "add"
                                ? status.good
                                : line.kind === "remove"
                                  ? status.bad
                                  : "var(--color-fg-3)",
                          }}
                        >
                          {line.kind === "add" ? "+ " : line.kind === "remove" ? "− " : "  "}
                          {line.text}
                        </div>
                      ))}
                    </pre>
                  </div>

                  {phase === "awaiting" && (
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPhase("approved")}
                        style={accent.solid}
                        className="rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhase("rejected")}
                        className="rounded-lg border border-line-strong px-4 py-2 text-sm font-medium text-fg-3 transition-colors hover:border-white/40 hover:text-fg-2"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {phase === "approved" && (
                    <div>
                      <p className="text-sm text-fg-2">Applied and pushed.</p>
                      <p className="mt-1.5 font-mono text-[0.6875rem] text-fg-3">
                        <span style={{ color: status.good }}>✓</span> commit {request.commit} ·{" "}
                        {request.target}
                      </p>
                      <p className="mt-3 text-xs leading-relaxed text-fg-3">
                        The change lives in a text file in a Git repository. I can read it, diff
                        it, revert it, or take the whole vault somewhere else. That is the reason
                        the memory is plain text in the first place.
                      </p>
                    </div>
                  )}

                  {phase === "rejected" && (
                    <div>
                      <p className="text-sm text-fg-2">Cancelled.</p>
                      <p className="mt-1.5 font-mono text-[0.6875rem] text-fg-3">
                        Nothing was written. No commit, no partial state.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </DemoFrame>
  );
}
