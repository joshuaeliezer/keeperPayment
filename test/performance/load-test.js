const autocannon = require('autocannon');
const { promisify } = require('util');

const run = promisify(autocannon);

async function loadTest() {
  console.log('🚀 Starting load test for Keeper Payment API...');
  
  const result = await run({
    url: 'http://localhost:3000',
    connections: 10,
    duration: 10,
    pipelining: 1,
    requests: [
      {
        method: 'GET',
        path: '/',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      {
        method: 'POST',
        path: '/payments',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId: '123e4567-e89b-12d3-a456-426614174000',
          amountTotal: 1000,
          keeperId: 'acct_test123',
        }),
      },
      {
        method: 'GET',
        path: '/payments',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    ],
  });

  console.log('📊 Load Test Results:');
  console.log('=====================');
  console.log(`Average Latency: ${result.latency.average}ms`);
  console.log(`P95 Latency: ${result.latency.p95}ms`);
  console.log(`P99 Latency: ${result.latency.p99}ms`);
  console.log(`Requests/sec: ${result.requests.average}`);
  console.log(`Total Requests: ${result.requests.total}`);
  console.log(`Total Errors: ${result.errors}`);
  console.log(`Total Timeouts: ${result.timeouts}`);
  console.log(`Throughput: ${result.throughput.average} KB/s`);
  
  return result;
}

// Run load test if this file is executed directly
if (require.main === module) {
  loadTest()
    .then(() => {
      console.log('✅ Load test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Load test failed:', error);
      process.exit(1);
    });
}

module.exports = { loadTest };
