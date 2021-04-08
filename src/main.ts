#!/usr/bin/env esr
import * as child from 'child_process';
import * as chalk from 'chalk';
import * as fs from 'fs/promises';
import * as esbuild from 'esbuild';
import * as sim from 'string-similarity';
import * as path from 'path';

const readFile = async (path) => new TextDecoder().decode(await fs.readFile(path));
const grey = (str) => chalk.rgb(125, 125, 125)(str);

const log = (message: string, description: string) => {
  console.log(` > src/main.ts: ${chalk.red('error:')} ${message}`)
  console.log(`    ${grey(description)}`);
}

export async function checkTypes(path: string) {
  return new Promise((resolve) => {
    return child.exec(`tsc ${path} --noEmit`, async (err, stdout, stderr) => {
      const errors = stdout
        .split(/\r?\n/g)
        .filter((x) => x.trim().length > 0);
      for (const error of errors) {
        const type = error.match(/TS\d+/)[0];
        const [first, message] = error
          .split(/TS\d+:/g)
          .map((x) => x.trim());

        const _ = first.match(/\(\d+,\d+\)/)[0];
        const position = _
          .slice(1, _.length - 1)
          .split(',')
          .map(Number);
        const file = String.raw`${first.match(/^[^(]+/)[0]}`;

        console.log(` > ${file}:${position[0]}:${position[1]}: ${chalk.red('error:')} ${grey(type)} ${message}`);

        const content: string = await readFile('src/test.ts');
        const line = content.split(/\r?\n/g)[position[0] - 1];

        const getNumberLength = (num) => `${num}`.length;
        const length = position[1] - 1;
        console.log(grey(`    ${position[0]} |`), grey(line));
        console.log(grey(`     ${new Array(getNumberLength(length)).fill(' ').join('')}|`), grey(new Array(length).fill(' ').join('') + '^'));
        console.log();
      }
      if (errors.length > 0) {
        console.log(` ${errors.length} error${errors.length > 1 ? 's' : ''} found.`);
      } else {
        console.log(' No errors found.')
      }
      resolve(null);
    });
  });
}

export async function run(src: string, check: boolean) {
  try {
    const content: string = await readFile(src);
    try {
      if (check === true) await checkTypes(src);
      const output = await esbuild.transform(content, { logLevel: 'error', sourcefile: src, loader: path.extname(src).slice(1) as esbuild.Loader });
      eval(output.code);
    } catch(_) {
      console.log(_)
    }
  } catch (err) {
    const best = sim.findBestMatch(src, await fs.readdir(path.dirname(src))).bestMatch.target;
    log('No such file or directory, open \'' + src + '\'', `May you want to run ${best} script.`);
  }
}

run('src/test.ts', true)
