"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Icon } from "@/components/cap/icons";
import { usePollRealtime } from "@/hooks/use-poll-realtime";
import { castVote } from "./actions";
import type {
  Poll,
  PollChoice,
  PollResult,
  PollVote,
  Profile,
} from "@/lib/supabase/types";

export function PollView({
  poll,
  choices,
  myVote,
  profile,
  results: initialResults,
  isAdmin,
}: {
  poll: Poll;
  choices: PollChoice[];
  myVote: PollVote | null;
  profile: Profile | null;
  results: PollResult[];
  isAdmin: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [voted, setVoted] = useState(Boolean(myVote));
  const [myChoiceId, setMyChoiceId] = useState<string | null>(
    myVote?.choice_id ?? null
  );

  const { status: liveStatus, results } = usePollRealtime(poll, initialResults);
  const closed = liveStatus === "closed";
  const isLocked = voted || closed;
  const showResults = isAdmin || closed;

  function isRestrictedForMe(c: PollChoice) {
    return Boolean(
      c.restricted_team_id &&
        profile?.team_id &&
        profile.team_id === c.restricted_team_id
    );
  }

  function tap(c: PollChoice) {
    if (isLocked) return;
    if (isRestrictedForMe(c)) {
      toast.error(
        c.restriction_message ?? "Vous ne pouvez pas voter pour ce choix."
      );
      return;
    }
    setSelected((s) => (s === c.id ? null : c.id));
  }

  function validate() {
    if (!selected) return;
    const fd = new FormData();
    fd.set("poll_id", poll.id);
    fd.set("choice_id", selected);
    startTransition(async () => {
      const res = await castVote(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur");
      } else {
        toast.success("Vote enregistré.");
        setVoted(true);
        setMyChoiceId(selected);
      }
    });
  }

  const totalVotes = results.reduce((acc, r) => acc + r.votes, 0);
  const myChoice = myChoiceId ?? selected;

  return (
    <div className="screen">
      <div style={{ padding: "12px 22px 0" }}>
        <Link href="/sondages" className="pl-back">
          <Icon.ArrowLeft />
          <span>SONDAGES</span>
        </Link>
      </div>

      <div className="scroll-area">
        <div className="pl-wrap pl-detail">
          <div className="pl-head">
            <div className="t-eyebrow">
              {closed ? "VOTE CLOS" : "VOTE OUVERT"}
            </div>
            <h2 className="pl-title t-display">{poll.title}</h2>
            {poll.description && (
              <div className="pl-q t-serif-it">{poll.description}</div>
            )}
          </div>

          <div className="pl-cards">
            {choices.map((c) => {
              const restricted = isRestrictedForMe(c);
              const hasImg = Boolean(c.image_path);
              const isMine = myChoice === c.id;
              const result = results.find((r) => r.choice_id === c.id);
              const pct =
                showResults && totalVotes > 0
                  ? Math.round(((result?.votes ?? 0) / totalVotes) * 100)
                  : 0;
              const disabled = restricted || isLocked;

              return (
                <button
                  key={c.id}
                  type="button"
                  className={
                    "pl-card" +
                    (restricted ? " locked" : "") +
                    (isMine ? " voted" : "") +
                    (myChoice && !isMine ? " dimmed" : "") +
                    (closed ? " closed" : "")
                  }
                  disabled={disabled}
                  onClick={() => tap(c)}
                >
                  {hasImg ? (
                    <div
                      className="pl-card-img"
                      style={{
                        backgroundImage: `url(${c.image_path})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {restricted && (
                        <div className="pl-card-lock">
                          <Icon.Lock />
                          <span className="t-mono">TON ÉQUIPE</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="pl-card-img pl-card-img--mini"
                      style={{
                        background:
                          "linear-gradient(150deg, oklch(40% 0.1 30), oklch(15% 0.04 30))",
                      }}
                    >
                      <span className="pl-card-emoji">
                        {(c.label || "").slice(0, 2).toUpperCase()}
                      </span>
                      {restricted && (
                        <div className="pl-card-lock">
                          <Icon.Lock />
                          <span className="t-mono">TON ÉQUIPE</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="pl-card-body">
                    {c.label && <div className="pl-card-name">{c.label}</div>}
                    {showResults ? (
                      <div className="pl-card-bar">
                        <div
                          className="pl-card-bar-fill"
                          style={{
                            width: pct + "%",
                            background: "var(--tertiary)",
                          }}
                        />
                        <div className="pl-card-bar-pct">
                          {pct}% · {result?.votes ?? 0}
                        </div>
                      </div>
                    ) : (
                      <div className="pl-card-cta">
                        {restricted
                          ? "INTERDIT"
                          : isLocked
                            ? isMine
                              ? "TON CHOIX"
                              : "VOTE VERROUILLÉ"
                            : isMine
                              ? "SÉLECTIONNÉ"
                              : "TOUCHE POUR CHOISIR"}
                      </div>
                    )}
                    {restricted && c.restriction_message && (
                      <div className="pl-card-restriction">
                        {c.restriction_message}
                      </div>
                    )}
                  </div>
                  {isMine && (
                    <div className="pl-card-checkmark">
                      <Icon.Check />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {!closed && (
            <div className="pl-validate">
              {voted ? (
                <div className="pl-validated">
                  <span className="pl-validated-check">
                    <Icon.Check />
                  </span>
                  <div>
                    <div className="pl-validated-eyebrow">VOTE VALIDÉ</div>
                    <div className="pl-validated-name">
                      {choices.find((c) => c.id === myChoiceId)?.label ??
                        "Choix enregistré"}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={validate}
                  disabled={!selected || isPending}
                >
                  {selected ? "Valider mon vote" : "Choisis une option"}
                  {selected && <Icon.ArrowRight />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
