const fs = require('fs');

const sender = JSON.parse(fs.readFileSync('packages/contracts/artifacts/contracts/BridgeGuardSender.sol/BridgeGuardSender.json'));
const receiver = JSON.parse(fs.readFileSync('packages/contracts/artifacts/contracts/BridgeGuardReceiver.sol/BridgeGuardReceiver.json'));

let page = fs.readFileSync('apps/web/src/app/ccip-test/page.tsx', 'utf-8');

page = page.replace('const senderBytecode = "0x";', 'const senderBytecode = "' + sender.bytecode + '";');
page = page.replace('const receiverBytecode = "0x";', 'const receiverBytecode = "' + receiver.bytecode + '";');

fs.writeFileSync('apps/web/src/app/ccip-test/page.tsx', page);
console.log('Injected bytecode successfully.');
