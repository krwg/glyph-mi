import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('npm pack includes ollama', () => {
  let workDir;

  after(() => {
    if (workDir && existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  it('npm pack --dry-run lists js/core/ollama.js', () => {
    const out = execFileSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: root,
      encoding: 'utf8',
      shell: true,
    });
    const parsed = JSON.parse(out);
    const files = parsed[0]?.files?.map((f) => f.path) || [];
    assert.ok(
      files.includes('js/core/ollama.js'),
      `expected js/core/ollama.js in pack, got: ${files.filter((f) => /ollama|core/.test(f)).join(', ') || '(none)'}`
    );
  });

  it('local-agent imports resolve from packed package layout', async () => {
    workDir = mkdtempSync(join(tmpdir(), 'glyph-mi-pack-'));
    const packOut = execFileSync('npm', ['pack', '--pack-destination', workDir], {
      cwd: root,
      encoding: 'utf8',
      shell: true,
    })
      .trim()
      .split(/\r?\n/)
      .pop();
    const tarball = join(workDir, packOut);
    assert.ok(existsSync(tarball), `tarball missing: ${tarball}`);

    const installDir = join(workDir, 'consumer');
    mkdirSync(installDir, { recursive: true });
    writeFileSync(
      join(installDir, 'package.json'),
      JSON.stringify({ name: 'glyph-mi-pack-consumer', private: true, type: 'module' })
    );
    execFileSync('npm', ['install', tarball, '--prefix', installDir], {
      encoding: 'utf8',
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const pkgRoot = join(installDir, 'node_modules', '@floke', 'glyph-mi');
    assert.ok(existsSync(join(pkgRoot, 'js', 'core', 'ollama.js')));
    assert.ok(existsSync(join(pkgRoot, 'js', 'providers', 'local-agent.js')));
    assert.equal(existsSync(join(pkgRoot, 'core', 'ollama.js')), false);

    const localAgentUrl = pathToFileURL(join(pkgRoot, 'js', 'providers', 'local-agent.js')).href;
    const mod = await import(localAgentUrl);
    assert.equal(typeof mod.analyzeLocal, 'function');
    assert.equal(typeof mod.isLocalAgentAvailable, 'function');

    const ollama = await import(pathToFileURL(join(pkgRoot, 'js', 'core', 'ollama.js')).href);
    assert.equal(typeof ollama.parseJsonLoose, 'function');
    assert.deepEqual(ollama.parseJsonLoose('prefix {"a":1} suffix'), { a: 1 });
  });
});
