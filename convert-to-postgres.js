// Script to convert MySQL queries to PostgreSQL in all route files
const fs = require('fs');
const path = require('path');

const routesDir = './routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
  let modified = false;
  
  // Find all db.query calls with ? placeholders
  const queryRegex = /db\.query\s*\(\s*['"`]([^'"`]*\?[^'"`]*)['"`]\s*,\s*\[([^\]]*)\]/g;
  
  content = content.replace(queryRegex, (match, query, params) => {
    modified = true;
    let paramCount = 0;
    const newQuery = query.replace(/\?/g, () => `$${++paramCount}`);
    return `db.query(\`${newQuery}\`, [${params}]`;
  });
  
  // Fix MySQL array destructuring [result] to PostgreSQL result.rows
  content = content.replace(/const \[(\w+)\] = await db\.query/g, (match, varName) => {
    modified = true;
    return `const ${varName}Result = await db.query`;
  });
  
  // Add .rows access after the query
  content = content.replace(/(\w+)Result = await db\.query\([^)]+\);?\s*\n\s*if \(\1\.length/g, (match, varName) => {
    return `${varName}Result = await db.query$1);\n    const ${varName} = ${varName}Result.rows;\n    if (${varName}.length`;
  });
  
  if (modified) {
    console.log(`Converting ${file}...`);
    fs.writeFileSync(filePath, content);
  }
});

console.log('Conversion complete!');
