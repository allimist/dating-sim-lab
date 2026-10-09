import type { Game } from './api';

export function Missions({ game }: { game: Game }) {
  const active = game.missions.filter(m => m.status === 'active');
  const recent = game.missions.filter(m => m.status !== 'active').slice(0, 4);
  return (
    <div className="card side-card">
      <h3>🎯 Missions</h3>
      {active.length === 0 && <div className="muted small">No missions right now.</div>}
      {active.map(m => (
        <div key={m.id} className="mission">
          <div className="mission-title">{m.title}</div>
          <div className="small">{m.description}</div>
          <div className="muted small">
            +{m.reward} pts{m.energyReward ? ` · +${m.energyReward} ⚡` : ''} · {m.deadlineDay === game.day ? 'today only' : `until day ${m.deadlineDay}`}
          </div>
        </div>
      ))}
      {recent.length > 0 && <div className="recent">
        {recent.map(m => <div key={m.id} className={`small mission-${m.status}`}>{m.status === 'done' ? '✅' : '❌'} {m.title}</div>)}
      </div>}
    </div>
  );
}

export function Hints({ game }: { game: Game }) {
  return (
    <div className="card side-card">
      <h3>💡 Reading her mood</h3>
      {Object.entries(game.hints).map(([mood, text]) => <div key={mood} className="small hint">{text}</div>)}
      <div className="small muted hint">Every girl also has her own taste. Watch how she reacts and remember what she tells you — and what you told <em>her</em>.</div>
    </div>
  );
}
