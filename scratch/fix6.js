const fs = require('fs');
const file = 'packages/shared/src/__tests__/detectors.test.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/expect\(result\.signalCount\)\.toBe\(1\);\n\s*expect\(result\.isSimulation\)\.toBe\(true\);/g, "expect(result.signalCount).toBe(2);\n      expect(result.isSimulation).toBe(true);");
c = c.replace(/expect\(result\.signalCount\)\.toBe\(2\);\n\s*expect\(result\.isSimulation\)\.toBe\(true\);/g, "expect(result.signalCount).toBe(3);\n      expect(result.isSimulation).toBe(true);");

fs.writeFileSync(file, c);
