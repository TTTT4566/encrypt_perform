import { basename, dirname, resolve } from 'node:path';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const sourceDirectory = resolve(repositoryRoot, 'classical-cipher-lab');
const outputDirectory = resolve(repositoryRoot, 'dist');

if (basename(outputDirectory) !== 'dist' || dirname(outputDirectory) !== repositoryRoot) {
  throw new Error(`拒绝清理非预期输出目录：${outputDirectory}`);
}

for (const required of ['index.html', 'assets', 'js']) {
  if (!existsSync(resolve(sourceDirectory, required))) {
    throw new Error(`规范源目录缺少公开资源：${required}`);
  }
}

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });
cpSync(resolve(sourceDirectory, 'index.html'), resolve(outputDirectory, 'index.html'));
cpSync(resolve(sourceDirectory, 'assets'), resolve(outputDirectory, 'assets'), { recursive: true });
cpSync(resolve(sourceDirectory, 'js'), resolve(outputDirectory, 'js'), { recursive: true });

console.log(`Built ${outputDirectory} from ${sourceDirectory}`);
