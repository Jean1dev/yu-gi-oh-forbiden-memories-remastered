"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { DuelistId } from "@yugioh/shared";

import { RosterNotice } from "../../components/free-duel/roster-notice.tsx";
import { RosterUnavailable } from "../../components/free-duel/roster-unavailable.tsx";
import { DuelistCard } from "../../components/free-duel/duelist-card.tsx";
import { EmptyRosterState } from "../../components/free-duel/empty-roster-state.tsx";
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
      <main className={styles.page} aria-busy="true">
        Loading duelists…
      </main>
    );
  }

  const { result } = state;
  if (result.notice === "catalog_unavailable") {
    return <RosterUnavailable onRetry={reload} />;
  }
  const duelists = result.roster?.duelists ?? [];

  return (
    <main className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Free Duel</p>
        <h1>Choose your opponent</h1>
      </header>
      {result.notice === "cache" ? <RosterNotice /> : null}
      {duelists.length === 0 ? (
        <div className={styles.empty}>
          <EmptyRosterState />
        </div>
      ) : (
        <div className={styles.grid} role="list" aria-label="Available duelists">
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
      <button
        className={styles.confirm}
        type="button"
        disabled={selectedId === null}
        onClick={() => {
          if (selectedId !== null) router.push(`/free-duel/${selectedId}/prepare`);
        }}
      >
        Confirm opponent
      </button>
    </main>
  );
}
