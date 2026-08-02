"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { DuelistId } from "@yugioh/shared";

import { RosterNotice } from "../../components/free-duel/roster-notice.tsx";
import { RosterUnavailable } from "../../components/free-duel/roster-unavailable.tsx";
import { DuelistCard } from "../../components/free-duel/duelist-card.tsx";
import { EmptyRosterState } from "../../components/free-duel/empty-roster-state.tsx";
import { OPPONENT_SELECTION_MESSAGES } from "../../lib/free-duel/opponent-selection-messages.ts";
import {
  loadClientRoster,
  type ClientRosterResult,
} from "../../lib/free-duel/load-client-roster.ts";
import styles from "./opponent-selection.module.css";

type ViewState =
  Readonly<{ status: "loading" }> | Readonly<{ status: "ready"; result: ClientRosterResult }>;

export function OpponentSelection() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<DuelistId | null>(null);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setSelectedId(null);
    void loadClientRoster().then((result) => setState({ status: "ready", result }));
  }, []);

  useEffect(reload, [reload]);

  if (state.status === "loading") {
    return (
      <main className="page" aria-busy="true">
        {OPPONENT_SELECTION_MESSAGES.loading}
      </main>
    );
  }

  const { result } = state;
  if (result.notice === "catalog_unavailable") {
    return <RosterUnavailable onRetry={reload} />;
  }
  const duelists = result.roster?.duelists ?? [];
  const selected = duelists.find((duelist) => duelist.id === selectedId) ?? null;

  return (
    <main className="page">
      <p>
        <Link href="/">{OPPONENT_SELECTION_MESSAGES.backToMenu}</Link>
      </p>
      <h1>{OPPONENT_SELECTION_MESSAGES.title}</h1>
      <p className={styles.instruction}>{OPPONENT_SELECTION_MESSAGES.instruction}</p>
      {result.notice === "cache" ? <RosterNotice /> : null}
      {duelists.length === 0 ? (
        <div className={styles.empty}>
          <EmptyRosterState />
        </div>
      ) : (
        <div
          className={styles.grid}
          role="list"
          aria-label={OPPONENT_SELECTION_MESSAGES.duelistListLabel}
        >
          {duelists.map((duelist) => (
            <DuelistCard
              key={duelist.id}
              duelist={duelist}
              selected={selectedId === duelist.id}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      )}
      <footer className={styles.footer}>
        <span className={styles.selectedName}>
          {selected ? selected.name : OPPONENT_SELECTION_MESSAGES.noOpponentSelected}
        </span>
        <button
          className={styles.confirm}
          type="button"
          disabled={selectedId === null}
          onClick={() => {
            if (selectedId !== null) router.push(`/free-duel/${selectedId}/prepare`);
          }}
        >
          {OPPONENT_SELECTION_MESSAGES.startDuel}
        </button>
      </footer>
    </main>
  );
}
