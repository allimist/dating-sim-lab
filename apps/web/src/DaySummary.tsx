import type { DaySummary as Summary, Game } from './api';
import { Face } from './Face';

export function DaySummary({ summary, game, onClose }: { summary: Summary; game: Game; onClose: () => void }) {
  const byId = new Map(game.girls.map(g => [g.id, g]));
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card modal">
        <h2>🌙 End of day {summary.day}</h2>
        <div className="summary-list">
          {summary.entries.map(e => {
            const g = byId.get(e.girlId);
            const text = e.blocked ? 'blocked you' : e.change > 0 ? 'likes you more' : e.change < 0 ? (e.talked ? 'likes you less' : 'feels ignored') : e.talked ? 'is the same' : 'didn’t hear from you';
            return (
              <div key={e.girlId} className="summary-row">
                {g && <Face face={g.face} expression={e.change > 0 ? 'smile' : e.change < 0 ? 'annoyed' : 'neutral'} size={40} name={e.name} />}
                <span><strong>{e.name}</strong> {text}</span>
                <span className={`change ${e.change > 0 ? 'pos' : e.change < 0 ? 'neg' : ''}`}>{e.change > 0 ? `+${e.change}` : e.change}</span>
              </div>
            );
          })}
        </div>
        {summary.failedMissions.length > 0 && (
          <div className="failed">{summary.failedMissions.map(m => <div key={m.id} className="small">❌ Missed: {m.title}</div>)}</div>
        )}
        <button className="primary" onClick={onClose}>{summary.gameOver ? 'See final score' : `Start day ${summary.day + 1} ☀️`}</button>
      </div>
    </div>
  );
}

export function GameOver({ game, onNew, onLeaderboard }: { game: Game; onNew: () => void; onLeaderboard: () => void }) {
  const s = game.score;
  return (
    <div className="card game-over">
      <h2>{game.perfect ? '🏆 Perfect run! Every girl has a crush on you!' : '🎬 Game over'}</h2>
      <div className="final-score">{s.total} <span>points</span></div>
      <div className="final-faces">
        {game.girls.map(g => (
          <div key={g.id} className="final-face">
            <Face face={g.face} expression={g.blocked ? 'angry' : g.tier === 'crush' ? 'happy' : g.tier === 'likes' ? 'smile' : g.tier === 'dislikes' ? 'annoyed' : 'neutral'} size={64} name={g.name} />
            <div className="small">{g.name}</div>
            <div className={`small tier-label-${g.tier}`}>{g.tierLabel}</div>
          </div>
        ))}
      </div>
      <div className="muted small">Affinity {s.affinity} · Missions {s.missionPoints} · Crushes {s.crushes} × 50{s.perfectBonus ? ` · Perfect bonus ${s.perfectBonus}` : ''}</div>
      <div className="row">
        <button className="primary" onClick={onNew}>Play again</button>
        <button className="secondary" onClick={onLeaderboard}>🏆 Leaderboard</button>
      </div>
    </div>
  );
}
