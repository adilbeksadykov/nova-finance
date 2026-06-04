import fs from 'fs';
const lines = fs.readFileSync('src/components/CategoriesView.tsx', 'utf8').split('\n');
fs.writeFileSync('src/components/CategoriesView.tsx', lines.slice(0, 382).join('\n') + '\n');
