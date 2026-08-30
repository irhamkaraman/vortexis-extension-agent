

async function test() {
  try {
    const res = await fetch('https://token.sensenova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-1aoBmAqJK9qd4Wu9DrhZq3PPoi7RlvQq'
      },
      body: JSON.stringify({
        model: 'sensenova-6.8-flash-lite',
        messages: [{ role: 'user', content: 'test' }]
      }),
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json();
    console.log('6.8 Flash Lite:', data);
  } catch(e) { console.error('6.8 failed:', e); }

  try {
    const res2 = await fetch('https://token.sensenova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-1aoBmAqJK9qd4Wu9DrhZq3PPoi7RlvQq'
      },
      body: JSON.stringify({
        model: 'sensenova-6.7-flash-lite',
        messages: [{ role: 'user', content: 'test' }]
      }),
      signal: AbortSignal.timeout(10000)
    });
    const data2 = await res2.json();
    console.log('6.7 Flash Lite:', data2);
  } catch(e) { console.error('6.7 failed:', e); }
}
test();
