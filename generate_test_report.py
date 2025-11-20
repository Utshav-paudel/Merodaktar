# Test Report Generator
# Generates a comprehensive markdown report from pytest results

import json
import sys
from datetime import datetime
from pathlib import Path


def load_json_report(report_path: str) -> dict:
    """Load JSON test report"""
    with open(report_path, 'r') as f:
        return json.load(f)


def generate_markdown_report(json_data: dict) -> str:
    """Generate markdown report from JSON data"""
    
    report = []
    report.append("# MeroDaktar Test Execution Report")
    report.append("")
    report.append(f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("")
    
    # Summary Section
    summary = json_data.get('summary', {})
    report.append("## Executive Summary")
    report.append("")
    report.append(f"- **Total Tests**: {summary.get('total', 0)}")
    report.append(f"- **Passed**: ✅ {summary.get('passed', 0)}")
    report.append(f"- **Failed**: ❌ {summary.get('failed', 0)}")
    report.append(f"- **Skipped**: ⏭️ {summary.get('skipped', 0)}")
    report.append(f"- **Duration**: {summary.get('duration', 0):.2f}s")
    
    # Calculate pass rate
    total = summary.get('total', 0)
    passed = summary.get('passed', 0)
    pass_rate = (passed / total * 100) if total > 0 else 0
    report.append(f"- **Pass Rate**: {pass_rate:.1f}%")
    report.append("")
    
    # Status Badge
    if pass_rate == 100:
        badge = "🟢 **All Tests Passing**"
    elif pass_rate >= 80:
        badge = "🟡 **Most Tests Passing**"
    else:
        badge = "🔴 **Tests Failing**"
    report.append(badge)
    report.append("")
    
    # Test Results by Category
    report.append("## Test Results by Category")
    report.append("")
    
    tests = json_data.get('tests', [])
    
    # Group tests by file
    test_groups = {}
    for test in tests:
        nodeid = test.get('nodeid', '')
        file_path = nodeid.split('::')[0] if '::' in nodeid else 'unknown'
        
        if file_path not in test_groups:
            test_groups[file_path] = []
        test_groups[file_path].append(test)
    
    # Report by category
    for file_path in sorted(test_groups.keys()):
        tests_in_file = test_groups[file_path]
        
        # Determine category
        if 'unit' in file_path:
            category = "📦 Unit Tests"
        elif 'integration' in file_path:
            category = "🔗 Integration Tests"
        elif 'e2e' in file_path:
            category = "🔄 End-to-End Tests"
        else:
            category = "📋 Other Tests"
        
        report.append(f"### {category} - `{file_path}`")
        report.append("")
        
        # Test results table
        report.append("| Test | Status | Duration |")
        report.append("|------|--------|----------|")
        
        for test in tests_in_file:
            test_name = test.get('nodeid', '').split('::')[-1]
            outcome = test.get('outcome', 'unknown')
            duration = test.get('duration', 0)
            
            # Status emoji
            if outcome == 'passed':
                status = "✅ Passed"
            elif outcome == 'failed':
                status = "❌ Failed"
            elif outcome == 'skipped':
                status = "⏭️ Skipped"
            else:
                status = f"❓ {outcome}"
            
            report.append(f"| {test_name} | {status} | {duration:.3f}s |")
        
        report.append("")
    
    # Failed Tests Details
    failed_tests = [t for t in tests if t.get('outcome') == 'failed']
    if failed_tests:
        report.append("## ❌ Failed Tests Details")
        report.append("")
        
        for test in failed_tests:
            test_name = test.get('nodeid', 'Unknown')
            report.append(f"### {test_name}")
            report.append("")
            
            # Error message
            call = test.get('call', {})
            longrepr = call.get('longrepr', 'No error details available')
            report.append("```")
            report.append(longrepr)
            report.append("```")
            report.append("")
    
    # Performance Analysis
    report.append("## ⚡ Performance Analysis")
    report.append("")
    
    # Slowest tests
    sorted_tests = sorted(tests, key=lambda x: x.get('duration', 0), reverse=True)
    slowest = sorted_tests[:10]
    
    report.append("### Slowest Tests")
    report.append("")
    report.append("| Rank | Test | Duration |")
    report.append("|------|------|----------|")
    
    for i, test in enumerate(slowest, 1):
        test_name = test.get('nodeid', '')
        duration = test.get('duration', 0)
        report.append(f"| {i} | {test_name} | {duration:.3f}s |")
    
    report.append("")
    
    # Coverage Information (if available)
    report.append("## 📊 Code Coverage")
    report.append("")
    report.append("_Coverage report will be generated when tests are run with `--cov` flag_")
    report.append("")
    report.append("```powershell")
    report.append("# Generate coverage report")
    report.append("python -m pytest tests/ --cov=app --cov-report=html")
    report.append("```")
    report.append("")
    
    # Recommendations
    report.append("## 💡 Recommendations")
    report.append("")
    
    if failed_tests:
        report.append("1. ⚠️ **Fix failing tests** - Review failed test details above")
    
    # Check for slow tests
    if slowest and slowest[0].get('duration', 0) > 5:
        report.append("2. ⏱️ **Optimize slow tests** - Some tests take over 5 seconds")
    
    if pass_rate < 100:
        report.append("3. 🎯 **Improve test reliability** - Current pass rate is below 100%")
    
    report.append("")
    
    # Footer
    report.append("---")
    report.append("")
    report.append("**Report Generated by**: MeroDaktar Test Suite")
    report.append(f"**Platform**: {json_data.get('environment', {}).get('Platform', 'Unknown')}")
    report.append(f"**Python**: {json_data.get('environment', {}).get('Python', 'Unknown')}")
    report.append("")
    
    return "\n".join(report)


def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python generate_test_report.py <json_report_path>")
        print("Example: python generate_test_report.py test_reports/test_report.json")
        sys.exit(1)
    
    json_path = sys.argv[1]
    
    if not Path(json_path).exists():
        print(f"Error: Report file not found: {json_path}")
        sys.exit(1)
    
    print(f"Loading test report from: {json_path}")
    json_data = load_json_report(json_path)
    
    print("Generating markdown report...")
    markdown = generate_markdown_report(json_data)
    
    # Save to file
    output_path = "TEST_EXECUTION_REPORT.md"
    with open(output_path, 'w') as f:
        f.write(markdown)
    
    print(f"✓ Report saved to: {output_path}")
    print(f"\nSummary:")
    print(f"  Total: {json_data.get('summary', {}).get('total', 0)} tests")
    print(f"  Passed: {json_data.get('summary', {}).get('passed', 0)}")
    print(f"  Failed: {json_data.get('summary', {}).get('failed', 0)}")
    print(f"  Duration: {json_data.get('summary', {}).get('duration', 0):.2f}s")


if __name__ == "__main__":
    main()
