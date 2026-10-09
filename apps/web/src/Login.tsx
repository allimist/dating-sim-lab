import { useEffect, useState } from 'react';
import { api, setToken, type User } from './api';
import { Face } from './Face';
import { GIRLS } from '@dsl/content';

export function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<{ email: string; name: string; password: string }[]>([]);

  useEffect(() => { api<typeof demo>('/auth/demo-accounts').then(setDemo).catch(() => {}); }, []);

  async function submit(e?: React.FormEvent, creds?: { email: string; password: string }) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = creds ?? (mode === 'login' ? { email, password } : { email, name, password });
      const r = await api<{ token: string; user: User }>(mode === 'login' || creds ? '/auth/login' : '/auth/register', body);
      setToken(r.token);
      onLogin(r.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-hero">
        <div className="login-faces">
          {GIRLS.map((g, i) => <Face key={g.id} face={g.face} expression={i % 2 ? 'smile' : 'happy'} size={72} name={g.name} />)}
        </div>
        <h1>💘 Dating Sim Lab</h1>
        <p>Chat with virtual matches. Each one has her own personality, moods and memory of <em>you</em>. Be nice, be charismatic, be funny — but know <strong>when</strong>. Can you make every one of them fall for you in 30 days?</p>
      </div>
      <form className="card login-card" onSubmit={submit}>
        <div className="tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Log in</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Sign up</button>
        </div>
        {mode === 'register' && <label>Name<input value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" required /></label>}
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={busy}>{mode === 'login' ? 'Log in' : 'Create account'}</button>
        {demo.length > 0 && (
          <div className="demo">
            <div className="muted small">Demo accounts — click to log in</div>
            <table>
              <tbody>
                {demo.map(d => (
                  <tr key={d.email} onClick={() => submit(undefined, d)}>
                    <td>{d.name}</td><td>{d.email}</td><td><code>{d.password}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </form>
      <p className="muted small center">All characters are fictional adults. No AI, no API keys — every line is written by hand and run by a rules engine.</p>
    </div>
  );
}
