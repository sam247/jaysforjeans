"use client";

import { MapPin, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { getLeaderboard } from "@/lib/leaderboard";
import { DEFAULT_BOARD_ID, type LeaderboardEntry, type LeaderboardPeriod } from "@/lib/leaderboard-shared";

const periods: Array<{ id: LeaderboardPeriod; label: string }> = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "all", label: "All Time" },
];

export function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("today");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const loadEntries = useCallback(async (selectedPeriod: LeaderboardPeriod) => {
    setLoading(true);
    setUnavailable(false);
    try {
      const response = await getLeaderboard(DEFAULT_BOARD_ID, selectedPeriod);
      setEntries(response.entries ?? []);
      setUnavailable(!response.available);
    } catch {
      setEntries([]);
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadEntries(period); }, [loadEntries, period]);

  return (
    <section className="scores-board" aria-labelledby="scores-board-title">
      <div className="scores-board-heading">
        <div>
          <h2 id="scores-board-title"><Trophy aria-hidden="true" /> The leaderboard</h2>
          <p><MapPin aria-hidden="true" /> Surrey Quays</p>
        </div>
        <span>Live scores</span>
      </div>
      <div className="leaderboard-tabs scores-tabs" role="tablist" aria-label="Leaderboard period">
        {periods.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={period === item.id} className={period === item.id ? "is-active" : ""} onClick={() => setPeriod(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="scores-columns" aria-hidden="true">
        <span>Rank</span><span>Nickname</span><span>Level</span><span>Progress</span><span>Total Jays</span>
      </div>
      <ol className="scores-list" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <li className="scores-message">Checking the waistband records…</li>
        ) : unavailable ? (
          <li className="scores-message"><strong>The leaderboard is having a lie-down.</strong>Please try again in a moment. The game is still ready to play.</li>
        ) : entries.length ? (
          entries.map((entry) => (
            <li key={`${entry.rank}-${entry.nickname}-${entry.createdAt}`}>
              <span className="scores-rank"><small>Rank</small>{entry.rank}</span>
              <strong><small>Nickname</small>{entry.nickname}</strong>
              <span><small>Level</small>{entry.highestLevel}</span>
              <span><small>Progress</small>{entry.progress}/{entry.target}</span>
              <span><small>Total Jays</small>{entry.totalJays}</span>
            </li>
          ))
        ) : <li className="scores-message">No scores yet. You could be first.</li>}
      </ol>
    </section>
  );
}
