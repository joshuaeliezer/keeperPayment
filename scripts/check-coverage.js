const { execSync } = require('child_process');

try {
  // Run coverage test and capture output
  const output = execSync('npm run test:cov', { encoding: 'utf8' });
  
  // Extract coverage percentage using multiple regex patterns
  let coverageMatch = output.match(/All files\s+\|\s+(\d+\.\d+)/);
  
  if (!coverageMatch) {
    // Try alternative pattern
    coverageMatch = output.match(/All files\s+(\d+\.\d+)/);
  }
  
  if (!coverageMatch) {
    // Try another pattern for different Jest output formats
    coverageMatch = output.match(/All files\s+\|\s+(\d+\.\d+)/);
  }
  
  if (!coverageMatch) {
    console.error('Could not find coverage information in test output');
    process.exit(1);
  }
  
  const coverage = parseFloat(coverageMatch[1]);
  const threshold = 60; // 60% threshold
  
  console.log(`Coverage: ${coverage}%`);
  console.log(`Threshold: ${threshold}%`);
  
  if (coverage < threshold) {
    console.error(`Coverage is below ${threshold}%: ${coverage}%`);
    process.exit(1);
  }
  
  console.log(`Coverage is good: ${coverage}%`);
  process.exit(0);
  
} catch (error) {
  console.error('Error running coverage check');
  if (process.env.NODE_ENV === 'development') {
    console.error('Details:', error.message);
  }
  process.exit(1);
}
