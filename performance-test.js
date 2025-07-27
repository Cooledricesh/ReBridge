const baseUrl = 'http://localhost:3001';

async function measureResponseTime(url, name) {
  const startTime = Date.now();
  try {
    const response = await fetch(url);
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`${name}: ${duration}ms - Status: ${response.status}`);
    return duration;
  } catch (error) {
    console.error(`${name}: Error - ${error.message}`);
    return -1;
  }
}

async function runTests() {
  console.log('Starting performance tests...\n');
  
  const tests = [
    { url: '/', name: 'Home Page' },
    { url: '/jobs', name: 'Jobs Page' },
    { url: '/api/jobs', name: 'Jobs API' },
    { url: '/login', name: 'Login Page' },
    { url: '/register', name: 'Register Page' },
  ];
  
  console.log('Cold start (first request):');
  for (const test of tests) {
    await measureResponseTime(baseUrl + test.url, test.name);
  }
  
  console.log('\nWarm requests (second round):');
  const warmTimes = [];
  for (const test of tests) {
    const time = await measureResponseTime(baseUrl + test.url, test.name);
    if (time > 0) warmTimes.push(time);
  }
  
  if (warmTimes.length > 0) {
    const avgTime = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;
    console.log(`\nAverage warm response time: ${avgTime.toFixed(2)}ms`);
  }
  
  console.log('\n--- Detailed Analysis ---');
  console.log('Note: First requests include compilation time in development mode');
  console.log('Production builds will be significantly faster');
}

runTests().catch(console.error);