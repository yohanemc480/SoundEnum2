import { python, run } from './build_environment.mjs';

// npm経由の起動に統一し、Windowsでもシェルを介さず同じnpmを呼び出す。
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this script with npm run build:deploy');

run(python, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', 'tools/requirements-release-audio.txt']);
run(python, ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_release_audio.py']);
for (const script of ['test', 'verify:data', 'build']) {
    run(process.execPath, [npm, 'run', script]);
}
