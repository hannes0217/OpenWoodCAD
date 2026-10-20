// Recheck browser-created fixtures, output consistency and the existing safety
// regressions without changing the reference artifacts or installing packages.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const vitest = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
const child = spawn(process.execPath, [vitest, 'run', '--maxWorkers=1', '--minWorkers=1',
  'test/practice-p1.test.ts', 'test/field-cancel.test.tsx', 'test/fit-view.test.ts',
  'test/persistence.test.ts', 'test/geom-client.test.ts', 'test/geometry-safety.test.ts',
  'test/workplanes.test.ts', 'test/precision.test.ts', 'test/cad-workspace.test.ts',
  'test/model-dimensions.test.ts', 'test/joint-edit.test.ts', 'test/generators.test.ts',
], { cwd: root, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
