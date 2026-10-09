import type { Game, Girl } from './api';
import { AffinityBar, Face } from './Face';

const MOOD_LABEL: Record<string, string> = { happy: 'Happy', sad: 'Sad', bored: 'Bored', stressed: 'Stressed', excited: 'Excited' };

export function Matches({ game, onChat, onProfile, onApologize, busy }: {
  game: Game;
  onChat: (g: Girl) => void;
  onProfile: (g: Girl) => void;
  onApologize: (g: Girl) => void;
  busy: boolean;
}) {
  const missionGirls = new Set(game.missions.filter(m => m.status === 'active' && m.girlId).map(m => m.girlId));
  return (
    <div className="matches">
      {game.girls.map(g => {
        const canChat = game.status === 'playing' && !g.blocked && !g.talkedToday && game.energy > 0;
        return (
          <div key={g.id} className={`match card tier-${g.tier} ${g.blocked ? 'blocked' : ''}`}>
            {missionGirls.has(g.id) && <div className="badge mission-badge" title="Has a mission">🎯</div>}
            {g.birthdayToday && !g.blocked && <div className="badge bday-badge" title="Birthday today">🎂</div>}
            <button className="match-face" onClick={() => onProfile(g)} title={`Open ${g.name}'s profile`}>
              <Face face={g.face} expression={g.expression} size={112} name={g.name} />
              {g.blocked && <div className="lock">🔒</div>}
            </button>
            <div className="match-name">{g.name}, {g.age}</div>
            <div className="muted small">{g.job} · {g.city}</div>
            <div className={`mood mood-${g.mood}`}>{g.moodEmoji} {MOOD_LABEL[g.mood]}</div>
            <AffinityBar value={g.affinity} blocked={g.blocked} />
            <div className={`tier tier-label-${g.tier}`}>{g.tierLabel}{g.careful && !g.blocked ? ' · careful' : ''}</div>
            {g.blocked ? (
              <button className="secondary" disabled={!g.canApologize || busy || game.energy <= 0 || game.status !== 'playing'} onClick={() => onApologize(g)}>
                {g.canApologize ? '💌 Apologise' : `Wait until day ${g.apologyAvailableDay}`}
              </button>
            ) : (
              <button className="primary" disabled={!canChat || busy} onClick={() => onChat(g)}>
                {g.talkedToday ? '✓ Talked today' : '💬 Chat'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
