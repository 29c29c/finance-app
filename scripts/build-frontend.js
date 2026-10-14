const fs = require('node:fs');
const path = require('node:path');
const babel = require('../public/vendor/babel.min.js');

// Compile with the already vendored Babel: mobile browsers only load React and plain JS.
const assets = path.join(__dirname, '..', 'public', 'assets');
fs.mkdirSync(path.join(assets, 'compiled'), { recursive: true });
for (const name of ['components', 'views', 'main']) {
  const source = fs.readFileSync(path.join(assets, `${name}.js`), 'utf8');
  const result = babel.transform(source, { presets: ['react'], comments: false, compact: false });
  fs.writeFileSync(path.join(assets, 'compiled', `${name}.js`), result.code + '\n');
  console.log(`Compiled ${name}.js`);
}
