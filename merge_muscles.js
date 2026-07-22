const fs = require('fs');

const publicData = JSON.parse(fs.readFileSync('./public/data/exercises.json', 'utf8'));
const rawData = JSON.parse(fs.readFileSync('./raw_data/exercises.json', 'utf8'));

let matchedCount = 0;

publicData.forEach(p => {
  // Try exact match first
  let r = rawData.find(x => x.name.toLowerCase() === p.name.toLowerCase());
  
  // Try without hyphens or spaces
  if (!r) {
    const cleanName = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    r = rawData.find(x => cleanName(x.name) === cleanName(p.name));
  }

  if (r && r.secondaryMuscles && r.secondaryMuscles.length > 0) {
    p.s = r.secondaryMuscles.map(m => m.toLowerCase());
    matchedCount++;
  }
});

fs.writeFileSync('./public/data/exercises.json', JSON.stringify(publicData));
console.log('Merged secondary muscles for ' + matchedCount + ' exercises.');
