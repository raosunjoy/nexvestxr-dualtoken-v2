const autocannon = require('autocannon');

const instance = autocannon({
  url: 'http://localhost:3000/api/health',
  connections: 100,
  duration: 10,
  requests: [
    {
      method: 'GET',
      path: '/api/health',
    },
  ],
});

autocannon.track(instance, { renderProgressBar: true });

instance.on('done', (result) => {
  console.log('Load test completed');
  console.log('Requests per second:', result.requests.average);
  console.log('Latency (ms):', result.latency.average);
  console.log('Errors:', result.errors);
});

instance.on('error', (err) => {
  console.error('Load test error:', err);
});