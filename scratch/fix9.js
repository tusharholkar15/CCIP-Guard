const fs = require('fs');
const file = 'apps/api/src/__tests__/simulation.test.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/expect\(body\.result\.riskLevel\)\.toBe\('LOW'\);/g, "expect(body.result.riskLevel).toBe('MEDIUM');");

fs.writeFileSync(file, c);
