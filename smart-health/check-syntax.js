const fs = require('fs');
const path = require('path');
const parser = require('./frontend/node_modules/@babel/parser');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && f !== 'node_modules') walk(full);
    else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      try {
        const code = fs.readFileSync(full, 'utf8');
        parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
      } catch (e) {
        console.log(`ERROR in ${full}: ${e.message}`);
      }
    }
  }
}

walk('./frontend/src');
console.log('Done');
