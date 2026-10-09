import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderFace, EXPRESSIONS } from '@dsl/avatar';
import { cast } from '@dsl/content';

test('every girl renders every expression as valid-looking SVG', () => {
  for (const g of cast(100)) {
    for (const ex of EXPRESSIONS) {
      const svg = renderFace(g.face, ex);
      assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
      assert.doesNotMatch(svg, /NaN|undefined/);
    }
  }
});

test('expressions differ and faces are unique', () => {
  const g = cast(1)[0];
  assert.equal(new Set(EXPRESSIONS.map(ex => renderFace(g.face, ex))).size, EXPRESSIONS.length);
  assert.equal(new Set(cast(100).map(x => renderFace(x.face, 'neutral'))).size, 100);
});
