import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  title: string;
  status: string;
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
}

interface TestReport {
  results: TestResult[];
  stats: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

function generateMarkdownReport(jsonReport: TestReport): string {
  const timestamp = new Date().toISOString();
  const stats = jsonReport.stats;
  const passRate = ((stats.passed / stats.total) * 100).toFixed(2);

  let markdown = `# Test Execution Report
Generated: ${timestamp}

## Summary
- Total Tests: ${stats.total}
- Passed: ${stats.passed}
- Failed: ${stats.failed}
- Pass Rate: ${passRate}%
- Total Duration: ${(stats.duration / 1000).toFixed(2)}s

## Test Results\n`;

  // Group results by status
  const passed = jsonReport.results.filter(r => r.status === 'passed');
  const failed = jsonReport.results.filter(r => r.status === 'failed');

  if (failed.length > 0) {
    markdown += '\n### ❌ Failed Tests\n';
    failed.forEach(test => {
      markdown += `\n#### ${test.title}
- Duration: ${(test.duration / 1000).toFixed(2)}s
- Error: ${test.error?.message || 'No error message provided'}
${test.error?.stack ? '\`\`\`\n' + test.error.stack + '\n\`\`\`' : ''}\n`;
    });
  }

  if (passed.length > 0) {
    markdown += '\n### ✅ Passed Tests\n';
    passed.forEach(test => {
      markdown += `\n- ${test.title} (${(test.duration / 1000).toFixed(2)}s)\n`;
    });
  }

  // Add links to artifacts
  markdown += '\n## Test Artifacts\n';
  markdown += '- [HTML Report](../playwright-report/index.html)\n';
  markdown += '- [Test Videos](../test-results)\n';
  markdown += '- [Screenshots](../test-results)\n';

  return markdown;
}

async function main() {
  try {
    // Read the JSON report
    const reportPath = path.join(process.cwd(), 'test-results', 'json-report.json');
    const jsonReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

    // Generate markdown report
    const markdown = generateMarkdownReport(jsonReport);

    // Save the markdown report
    const outputPath = path.join(process.cwd(), 'test-results', 'summary-report.md');
    fs.writeFileSync(outputPath, markdown);

    console.log('Report generated successfully:', outputPath);
  } catch (error) {
    console.error('Error generating report:', error);
    process.exit(1);
  }
}

main(); 