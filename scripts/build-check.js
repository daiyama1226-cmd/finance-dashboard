const { accessSync, constants } = require('node:fs');

for (const file of ['index.html', 'src/app.js', 'src/styles.css']) {
  accessSync(file, constants.R_OK);
}

console.log('Static web app files are present.');
