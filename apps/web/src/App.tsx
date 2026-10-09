import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, ApiError, type ConversationView, type DaySummary as Summary, type Game, type Girl, type User } from './api';
import { Login } from './Login';
import { Matches } from './Matches';
import { Chat } from './Chat';
import { Missions, Hints } from './Missions';
import { DaySummary, GameOver } from './DaySummary';
import { GirlProfile } from './GirlProfile';
import { Leaderboard } from './Leaderboard';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(!!getToken());
  const [game, setGame] = useState<Game | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [chat, setChat] = useState<ConversationView | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [profile, setProfile] = useState<string | null>(null);
  const [board, setBoard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; kind: 'info' | 'error' } | null>(null);

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      setToken(null);
      setUser(null);
      return;
    }
    setNotice({ text: (e as Error).message, kind: 'error' });
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    api<User>('/me').then(setUser).catch(() => setToken(null)).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api<{ game: Game | null }>('/game')
      .then(async r => {
        setGame(r.game);
        if (r.game?.activeConversationId) {
          const a = await api<{ conversation: ConversationView | null }>('/conversations/active');
          setChat(a.conversation);
        }
      })
      .catch(fail)
      .finally(() => setLoaded(true));
  }, [user, fail]);

  async function run<T>(fn: () => Promise<T>) {
    setBusy(true);
    setNotice(null);
    try { return await fn(); } catch (e) { fail(e); } finally { setBusy(false); }
  }

  const newGame = () => run(async () => {
    const r = await api<{ game: Game }>('/game/new', { castSize: 5 });
    setGame(r.game);
    setSummary(null);
    setChat(null);
  });

  const startChat = (g: Girl) => run(async () => {
    const r = await api<{ conversation: ConversationView; game: Game }>('/conversations', { girlId: g.id });
    setGame(r.game);
    setChat(r.conversation);
  });

  const apologize = (g: Girl) => run(async () => {
    const r = await api<{ accepted: boolean; line: string; game: Game }>(`/girls/${g.id}/apologize`, {});
    setGame(r.game);
    setNotice({ text: `${g.name}: “${r.line}”${r.accepted ? ' — she unblocked you. Be careful now.' : ''}`, kind: r.accepted ? 'info' : 'error' });
  });

  const endDay = () => run(async () => {
    const r = await api<{ summary: Summary; game: Game }>('/game/day/next', {});
    setGame(r.game);
    setSummary(r.summary);
  });

  const logout = () => { setToken(null); setUser(null); setGame(null); setChat(null); setLoaded(false); };

  if (checking) return <div className="center muted pad">Loading…</div>;
  if (!user) return <Login onLogin={u => { setLoaded(false); setUser(u); }} />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">💘 Dating Sim Lab</div>
        {game && (
          <div className="stats">
            <span className="stat" title="Day">📅 Day {game.day}/{game.maxDays}</span>
            <span className="stat" title="Conversations left today">⚡ {'●'.repeat(Math.max(0, game.energy))}{'○'.repeat(Math.max(0, game.energyPerDay - game.energy))}</span>
            <span className="stat" title="Score">⭐ {game.score.total}</span>
            <span className="stat" title="Girls who like you">❤️ {game.score.likes}/{game.girls.length}</span>
          </div>
        )}
        <div className="actions">
          {game?.status === 'playing' && <button className="primary" disabled={busy} onClick={endDay}>End day 🌙</button>}
          <button className="ghost" onClick={() => setBoard(true)}>🏆</button>
          <button className="ghost" disabled={busy} onClick={() => { if (!game || game.status === 'over' || confirmNew()) newGame(); }}>New game</button>
          <button className="ghost" onClick={logout} title={`Logged in as ${user.name}`}>Log out</button>
        </div>
      </header>

      {notice && <div className={`notice ${notice.kind}`} onClick={() => setNotice(null)}>{notice.text}</div>}

      {!loaded ? <div className="center muted pad">Loading…</div> : !game ? (
        <div className="card welcome">
          <h2>Welcome, {user.name}! 👋</h2>
          <p>You have <strong>30 days</strong> and <strong>2 conversations a day</strong>. Five matches are waiting. Each has her own personality, a mood that changes every day, and a memory of what <em>you</em> told <em>her</em> — and only her.</p>
          <ul>
            <li>Pick a reply style each turn: 🤗 Nice, ✨ Charismatic, 😂 Funny, 😉 Flirty, 💭 Deep listener or 😎 Confident.</li>
            <li>Read her mood. A sad girl wants to be heard; a bored one wants fun.</li>
            <li>Remember her stories, and keep your own story straight with each of them.</li>
            <li>Drop too low and she blocks you. Complete missions for bonus points.</li>
          </ul>
          <button className="primary big" disabled={busy} onClick={newGame}>Start dating 💘</button>
        </div>
      ) : (
        <main className="layout">
          <section>
            {game.status === 'over' && <GameOver game={game} onNew={newGame} onLeaderboard={() => setBoard(true)} />}
            {game.status === 'playing' && game.energy === 0 && !chat && (
              <div className="notice info inline">No conversations left today. Press <strong>End day 🌙</strong> to continue.</div>
            )}
            <Matches game={game} busy={busy} onChat={startChat} onProfile={g => setProfile(g.id)} onApologize={apologize} />
          </section>
          <aside>
            <Missions game={game} />
            <Hints game={game} />
          </aside>
        </main>
      )}

      {chat && game && <Chat key={chat.id} initial={chat} game={game} onUpdate={setGame} onClose={() => setChat(null)} />}
      {summary && game && <DaySummary summary={summary} game={game} onClose={() => setSummary(null)} />}
      {profile && game && <GirlProfile girlId={profile} game={game} onClose={() => setProfile(null)} />}
      {board && <Leaderboard onClose={() => setBoard(false)} />}
    </div>
  );
}

function confirmNew() {
  // A native confirm is fine here: it only guards an accidental restart.
  return window.confirm('Start a new game? Your current game will be abandoned.');
}
