import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

describe('eslint config', () => {
  const lint = async (code: string) =>
    new ESLint().lintText(code, { filePath: 'src/probe.tsx' }).then((r) => r[0].messages);

  it('bans dangerouslySetInnerHTML', async () => {
    const messages = await lint(
      'export const A = ({ h }: { h: string }) => <div dangerouslySetInnerHTML={{ __html: h }} />;\n',
    );
    expect(messages.some((m) => m.ruleId === 'no-restricted-syntax')).toBe(true);
  }, 30_000);

  it('allows ordinary JSX', async () => {
    expect(await lint('export const A = () => <div>hi</div>;\n')).toEqual([]);
  });
});
