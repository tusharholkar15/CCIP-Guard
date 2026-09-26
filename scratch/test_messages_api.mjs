async function test() {
  const r = await fetch('http://localhost:3001/api/messages?limit=10');
  const d = await r.json();
  console.log('TOTAL:', d.total);
  console.log('FIRST 8 MESSAGES:');
  d.data.slice(0, 8).forEach(m => {
    console.log(`${m.sourceChainName} (${m.sourceChainId}) -> ${m.destinationChainName} (${m.destinationChainId}) | State: ${m.state} | Selector: ${m.sourceChainSelector}`);
  });

  const r2 = await fetch('http://localhost:3001/api/messages?search=0xbeb08dc5ef344c51d5d7dee52d30a9daacccd875fde526113cb2ff95f9dfa502');
  const d2 = await r2.json();
  console.log('VERIFIED MESSAGE:');
  console.log(d2.data[0]);
}

test().catch(console.error);
