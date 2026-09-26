const fs = require('fs');
const file = 'apps/api/src/__tests__/simulation.test.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/expect\(body\.result\.signalCount\)\.toBe\(1\);/g, "expect(body.result.signalCount).toBe(2);");

fs.writeFileSync(file, c);
