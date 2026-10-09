import { useEffect, useState } from 'react';
import { api } from './api';

interface Row { name: string; score: number; crushes: number; likes: number; cast_size: number; perfect: boolean; day: number; created_at: string }

export function Leaderboard({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => { api<{ scores: Row[] }>('/leaderboard').then(r => setRows(r.scores)).catch(() => setRows([])); }, []);
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card modal">
        <button className="close" onClick={onClose}>✕</button>
        <h2>🏆 Leaderboard</h2>
        {!rows ? <div className="muted">Loading…</div> : rows.length === 0 ? <div className="muted">No finished games yet. Be the first!</div> : (
          <table className="board">
            <thead><tr><th>#</th><th>Player</th><th>Score</th><th>Crushes</th><th>Finished</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{r.name}{r.perfect ? ' 🏆' : ''}</td>
                  <td><strong>{r.score}</strong></td>
                  <td>{r.crushes}/{r.cast_size}</td>
                  <td className="muted small">day {r.day}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
