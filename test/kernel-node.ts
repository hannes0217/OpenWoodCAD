import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import opencascade from 'replicad-opencascadejs';
import { initKernel } from '../src/geom/kernel';

const require = createRequire(import.meta.url);

export async function loadKernel(): Promise<void> {
  const wasmBinary = readFileSync(require.resolve('replicad-opencascadejs/wasm'));
  await initKernel(() => (opencascade as unknown as (o: object) => Promise<never>)({ wasmBinary }));
}
