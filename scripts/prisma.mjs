import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const schema = fileURLToPath(new URL('../apps/api/prisma/schema.prisma', import.meta.url));
const cli = join(dirname(require.resolve('prisma/package.json')), 'build', 'index.js');
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2), '--schema', schema], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
