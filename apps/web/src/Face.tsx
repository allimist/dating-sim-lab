import { useMemo } from 'react';
import { renderFace } from '@dsl/avatar';
import type { FaceSpec } from '@dsl/content';
import type { Expression } from './api';

/** A girl's procedural face. The SVG is generated locally, never from user input. */
export function Face({ face, expression, size, name }: { face: FaceSpec; expression: Expression; size: number; name: string }) {
  const svg = useMemo(() => renderFace(face, expression, { size, title: `${name} looks ${expression}` }), [face, expression, size, name]);
  return <div className={`face face-${expression}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function AffinityBar({ value, blocked }: { value: number; blocked?: boolean }) {
  const pct = Math.abs(value) / 2;
  return (
    <div className={`affinity ${blocked ? 'is-blocked' : ''}`} title={`Affinity ${value}`}>
      <div className="affinity-mid" />
      <div className={`affinity-fill ${value >= 0 ? 'pos' : 'neg'}`} style={value >= 0 ? { left: '50%', width: `${pct}%` } : { right: '50%', width: `${pct}%` }} />
      <div className="affinity-tick" style={{ left: `${50 + 25 / 2}%` }} title="Likes you" />
      <div className="affinity-tick" style={{ left: `${50 + 70 / 2}%` }} title="Crush" />
    </div>
  );
}
