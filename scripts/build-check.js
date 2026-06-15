const { accessSync, constants } = require('node:fs');
const { execFileSync } = require('node:child_process');

for (const file of ['index.html', 'src/app.js', 'src/styles.css']) {
  accessSync(file, constants.R_OK);
}

execFileSync(process.execPath, ['--check', 'src/app.js'], { stdio: 'inherit' });
console.log('Static web app files are present and JavaScript syntax is valid.');
