import { afterAll, describe, expect, it } from 'vitest';
import { safeInstall, safeOverride } from '@/main-world/safe-override';

// The mask patches the real Function.prototype.toString for the whole process.
const pristineToString = Function.prototype.toString;
afterAll(() => {
  Function.prototype.toString = pristineToString;
});

describe('safeOverride', () => {
  it('replaces the method and reports success', () => {
    const target = { greet: (name: string) => `hi ${name}` };
    const installed = safeOverride(
      target,
      'greet',
      (original) => (name: string) => `${original(name)}!`,
      { label: 'greet' },
    );

    expect(installed).toBe(true);
    expect(target.greet('a')).toBe('hi a!');
  });

  it('preserves name and length, which are cheap detection tells', () => {
    const target = {
      parse: function parse(_a: string, _b?: unknown) {
        return 1;
      },
    };
    safeOverride(
      target,
      'parse',
      () =>
        function replacement() {
          return 2;
        } as never,
      {
        label: 'parse',
      },
    );

    expect(target.parse.name).toBe('parse');
    expect(target.parse.length).toBe(2);
  });

  it('reports failure through onError instead of throwing', () => {
    const errors: string[] = [];
    const frozen: { method: () => number } = Object.freeze({ method: () => 1 });

    const installed = safeOverride(frozen, 'method', () => () => 2, {
      label: 'frozen',
      onError: (_error, label) => errors.push(label),
    });

    expect(installed).toBe(false);
    expect(errors).toEqual(['frozen']);
    expect(frozen.method()).toBe(1);
  });
});

describe('native masking', () => {
  it('makes a hooked function report the original native source', () => {
    const target = { parse: JSON.parse };
    safeOverride(
      target,
      'parse',
      (original) => ((text: string) => original(text)) as typeof JSON.parse,
      { label: 'JSON.parse' },
    );

    // This is the check YouTube's detection performs.
    expect(target.parse.toString()).toContain('[native code]');
    expect(target.parse.toString()).not.toContain('=>');
  });

  it('masks the mask itself', () => {
    // Without this, `Function.prototype.toString.toString()` exposes the patch.
    expect(Function.prototype.toString.toString()).toContain('[native code]');
    expect(Function.prototype.toString.name).toBe('toString');
  });

  it('leaves unhooked functions reporting their real source', () => {
    function ordinary() {
      return 42;
    }
    expect(ordinary.toString()).toContain('return 42');
  });
});

describe('safeInstall', () => {
  it('isolates a throwing installer so siblings still run', () => {
    const ran: string[] = [];
    const errors: string[] = [];
    const onError = (_e: unknown, label: string) => errors.push(label);

    safeInstall('first', () => ran.push('first'), onError);
    safeInstall(
      'boom',
      () => {
        throw new Error('nope');
      },
      onError,
    );
    safeInstall('third', () => ran.push('third'), onError);

    expect(ran).toEqual(['first', 'third']);
    expect(errors).toEqual(['boom']);
  });
});
