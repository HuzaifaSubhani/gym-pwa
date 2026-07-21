const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            searchFiles(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // We want to find cases where a setState or context method is called directly in the component body
            // We'll look for lines that have typical setState names but are NOT inside hooks or handlers
            // Since parsing TSX is complex, we can use regex to find lines like `setSomething(` or `addCustomExercise(`
            // and manually check them.
            
            const lines = content.split('\n');
            lines.forEach((line, i) => {
                if (line.match(/\b(set[A-Z]\w*|add[A-Z]\w*|update[A-Z]\w*|remove[A-Z]\w*)\(/)) {
                    if (!line.includes('=>') && !line.includes('function') && !line.includes('const') && !line.includes('let') && !line.includes('var')) {
                        console.log(`${fullPath}:${i + 1}: ${line.trim()}`);
                    }
                }
            });
        }
    }
}

searchFiles(path.join(__dirname, 'src'));
