import { useEffect, useRef, useState } from 'react';
import { api, type ConversationView, type Game, type ReplyResult } from './api';
import { AffinityBar, Face } from './Face';

export function Chat({ initial, game, onUpdate, onClose }: {
  initial: ConversationView;
  game: Game;
  onUpdate: (g: Game) => void;
  onClose: () => void;
}) {
  const [convo, setConvo] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ key: number; delta: number } | null>(null);
  const [missionDone, setMissionDone] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [convo.messages.length, typing]);

  async function choose(optionId: string) {
    setBusy(true);
    setError(null);
    setTyping(true);
    try {
      const r = await api<{ result: ReplyResult; conversation: ConversationView; game: Game }>(`/conversations/${convo.id}/reply`, { optionId });
      // A short "typing…" pause makes her replies feel human.
      await new Promise(res => setTimeout(res, 550));
      setConvo(r.conversation);
      onUpdate(r.game);
      setToast({ key: Date.now(), delta: r.result.delta });
      if (r.result.completedMissions.length) setMissionDone(m => [...m, ...r.result.completedMissions.map(x => x.title)]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTyping(false);
      setBusy(false);
    }
  }

  const girl = convo.girl;
  const hint = game.hints[girl.mood];
  const ended = convo.status === 'ended';

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && ended && onClose()}>
      <div className="chat card">
        <div className="chat-head">
          <Face face={girl.face} expression={convo.expression} size={88} name={girl.name} />
          <div className="chat-head-info">
            <div className="chat-name">{girl.name}, {girl.age} <span className="muted small">· {girl.job}</span></div>
            <div className={`mood mood-${girl.mood}`}>{girl.moodEmoji} {hint}</div>
            <AffinityBar value={girl.affinity} blocked={girl.blocked} />
            <div className={`tier tier-label-${girl.tier}`}>{girl.tierLabel}</div>
          </div>
          {toast && <div key={toast.key} className={`delta-toast ${toast.delta >= 0 ? 'pos' : 'neg'}`}>{toast.delta >= 0 ? `+${toast.delta} ❤️` : `${toast.delta} 💔`}</div>}
          <button className="close" onClick={onClose} disabled={!ended} title={ended ? 'Close' : 'Finish the conversation first'}>✕</button>
        </div>

        <div className="chat-progress">{Array.from({ length: convo.turns }, (_, i) => <span key={i} className={i < convo.turn || ended ? 'done' : i === convo.turn ? 'now' : ''} />)}</div>

        <div className="messages">
          {convo.messages.map((m, i) => (
            <div key={i} className={`msg ${m.from} ${m.outcome ? `outcome-${m.outcome}` : ''}`}>
              {m.from === 'me' && m.style && <span className="msg-style">{game.styles[m.style].emoji}</span>}
              <span className="bubble">{m.text}</span>
              {m.delta !== undefined && m.delta !== 0 && <span className={`msg-delta ${m.delta > 0 ? 'pos' : 'neg'}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>}
            </div>
          ))}
          {typing && <div className="msg her"><span className="bubble typing"><i /><i /><i /></span></div>}
          <div ref={endRef} />
        </div>

        {missionDone.map(t => <div key={t} className="mission-done">🎯 Mission complete: {t}</div>)}
        {error && <div className="error">{error}</div>}

        {!ended ? (
          <div className="options">
            {convo.options.map(o => (
              <button key={o.id} className="option" disabled={busy} onClick={() => choose(o.id)}>
                <span className={`style-chip style-${o.style}`}>{game.styles[o.style].emoji} {game.styles[o.style].label}</span>
                {o.tag === 'memory' && <span className="tag-chip">💭 memory</span>}
                {o.tag === 'gift' && <span className="tag-chip">🎁 gift</span>}
                {o.tag === 'fact' && <span className="tag-chip">🙋 about you</span>}
                <span className="option-text">{o.text}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="chat-end">
            <div className={`chat-total ${convo.total >= 0 ? 'pos' : 'neg'}`}>
              {convo.endReason === 'walked_out' ? `💔 ${girl.name} walked out and blocked you.` : `Conversation over: ${convo.total >= 0 ? '+' : ''}${convo.total} affinity`}
            </div>
            <button className="primary" onClick={onClose}>Back to matches</button>
          </div>
        )}
      </div>
    </div>
  );
}
