import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SELF = fileURLToPath(import.meta.url);

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
  '.vercel', '.turbo', '.output', '.cache',
]);

const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.json', '.md',
  '.yml', '.yaml', '.css', '.html', '.toml', '.prisma', '.sql', '.txt',
]);

const FORBIDDEN = /revolution[-_ ]?x|\brevx\b/i;
const SKIP_FILE = /(\/\.|\.|\/|^)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/;

function listFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) listFiles(join(dir, entry.name), acc);
      continue;
    }
    const name = entry.name;
    if (name.startsWith('.env') || TEXT_EXT.has(extname(name))) acc.push(join(dir, name));
  }
  return acc;
}

describe('guarda: nenhuma referência a "revolutionx"', () => {
  it('não encontra a string em nenhum arquivo de texto do projeto', () => {
    const offenders = listFiles(ROOT)
      .filter((file) => file !== SELF && !SKIP_FILE.test(file))
      .filter((file) => {
        try {
          return FORBIDDEN.test(readFileSync(file, 'utf8'));
        } catch {
          return false;
        }
      })
      .map((file) => relative(ROOT, file));

    expect(offenders).toEqual([]);
  });
});
