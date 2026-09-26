async function test() {
  const r1 = await fetch('http://localhost:3001/api/messages?search=0x22824ee500792d86810e226fe2ee93dbf512207a1d252851c4f19723d3f7b62f');
  const d1 = await r1.json();
  console.log('Search 0x2282... Status:', r1.status, 'Total:', d1.total, 'State:', d1.data[0]?.state);

  const r2 = await fetch('http://localhost:3001/api/dashboard/stats');
  const d2 = await r2.json();
  console.log('Dashboard stats:', JSON.stringify(d2));

  const r3 = await fetch('http://localhost:3001/api/lanes');
  const d3 = await r3.json();
  console.log('Lanes count:', d3.data?.length);
  for (const l of d3.data) {
    console.log(` - ${l.sourceChainName} -> ${l.destinationChainName} | msgs: ${l.messageCount} | status: ${l.status}`);
  }
}
test().catch(console.error);
