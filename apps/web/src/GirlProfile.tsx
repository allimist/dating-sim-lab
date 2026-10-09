import { useEffect, useState } from 'react';
import { api, type Game, type Profile } from './api';
import { AffinityBar, Face } from './Face';

export function GirlProfile({ girlId, game, onClose }: { girlId: string; game: Game; onClose: () => void }) {
  const [p, setP] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<{ girl: Profile }>(`/girls/${girlId}`).then(r => setP(r.girl)).catch(e => setError(e.message)); }, [girlId]);

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card modal profile">
        <button className="close" onClick={onClose}>✕</button>
        {error && <div className="error">{error}</div>}
        {!p ? <div className="muted">Loading…</div> : (
          <>
            <div className="profile-head">
              <Face face={p.face} expression={p.expression} size={120} name={p.name} />
              <div>
                <h2>{p.name}, {p.age}</h2>
                <div className="muted">{p.job} · {p.city}</div>
                <p className="bio">{p.bio}</p>
                <div className={`mood mood-${p.mood}`}>{p.moodEmoji} {game.hints[p.mood]}</div>
                <AffinityBar value={p.affinity} blocked={p.blocked} />
                <div className={`tier tier-label-${p.tier}`}>{p.tierLabel} ({p.affinity})</div>
              </div>
            </div>
            <div className="two-col">
              <div>
                <h4>🧠 What she knows about you</h4>
                <div className="muted small">Only what you told <em>her</em>. Don’t contradict it!</div>
                {p.sheKnows.length === 0 ? <div className="small muted">Nothing yet.</div> : p.sheKnows.map(f => <div key={f.key} className="fact">{f.text} <span className="muted small">· day {f.day}</span></div>)}
              </div>
              <div>
                <h4>💭 What you know about her</h4>
                <div className="muted small">Bring these up later — she’ll love that you remembered.</div>
                {p.youKnow.length === 0 ? <div className="small muted">Nothing yet.</div> : p.youKnow.map(f => <div key={f.key} className="fact">{f.text} <span className="muted small">· day {f.day}</span></div>)}
              </div>
            </div>
            {p.history.length > 0 && (
              <>
                <h4>📜 Recent conversations</h4>
                {p.history.map((h, i) => (
                  <details key={i} className="history">
                    <summary>Day {h.day} · {h.total >= 0 ? '+' : ''}{h.total}</summary>
                    {h.turns.map((t, j) => (
                      <div key={j} className="small history-turn">
                        <div>👩 {t.her.join(' ')}</div>
                        <div>🙋 {game.styles[t.style].emoji} {t.me}</div>
                        <div>👩 {t.reaction} <span className={t.delta >= 0 ? 'pos' : 'neg'}>({t.delta >= 0 ? '+' : ''}{t.delta})</span></div>
                      </div>
                    ))}
                  </details>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
