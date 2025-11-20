#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run pytest tests with various reporting options

.DESCRIPTION
    This script runs the test suite with different reporting formats:
    - Terminal output with verbose details
    - HTML report
    - JSON report
    - JUnit XML report (for CI/CD)

.PARAMETER Coverage
    Run tests with code coverage analysis

.PARAMETER Html
    Generate HTML test report

.PARAMETER Verbose
    Run tests in verbose mode

.PARAMETER Tests
    Specific test path or pattern to run (default: all tests)

.EXAMPLE
    .\run_tests.ps1
    Run all tests with basic output

.EXAMPLE
    .\run_tests.ps1 -Coverage -Html -Verbose
    Run all tests with coverage, HTML report, and verbose output

.EXAMPLE
    .\run_tests.ps1 -Tests "tests/unit"
    Run only unit tests
#>

param(
    [switch]$Coverage,
    [switch]$Html,
    [switch]$Verbose,
    [string]$Tests = "tests/"
)

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         MeroDaktar Test Suite Runner                     ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Create reports directory if it doesn't exist
$reportsDir = "test_reports"
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir | Out-Null
    Write-Host "✓ Created reports directory: $reportsDir" -ForegroundColor Green
}

# Build pytest command
$pytestCmd = "python -m pytest $Tests"

# Add verbose flag
if ($Verbose) {
    $pytestCmd += " -v"
}

# Add coverage options
if ($Coverage) {
    Write-Host "📊 Running with code coverage analysis..." -ForegroundColor Yellow
    $pytestCmd += " --cov=app --cov-report=term-missing --cov-report=html:$reportsDir/coverage_html --cov-report=xml:$reportsDir/coverage.xml"
}

# Add HTML report
if ($Html) {
    Write-Host "📄 Generating HTML test report..." -ForegroundColor Yellow
    $pytestCmd += " --html=$reportsDir/test_report.html --self-contained-html"
}

# Add JUnit XML report (always generate for CI/CD)
$pytestCmd += " --junitxml=$reportsDir/junit.xml"

# Add JSON report
$pytestCmd += " --json-report --json-report-file=$reportsDir/test_report.json"

Write-Host "🧪 Running tests..." -ForegroundColor Cyan
Write-Host "Command: $pytestCmd" -ForegroundColor Gray
Write-Host ""

# Run pytest
$startTime = Get-Date
Invoke-Expression $pytestCmd
$exitCode = $LASTEXITCODE
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              Test Execution Summary                       ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Duration: $($duration.ToString('mm\:ss'))" -ForegroundColor White
Write-Host "Reports saved in: $reportsDir" -ForegroundColor White
Write-Host ""

if ($exitCode -eq 0) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
} elseif ($exitCode -eq 1) {
    Write-Host "✗ Some tests failed!" -ForegroundColor Red
} elseif ($exitCode -eq 2) {
    Write-Host "✗ Test execution interrupted!" -ForegroundColor Red
} elseif ($exitCode -eq 3) {
    Write-Host "✗ Internal error during test execution!" -ForegroundColor Red
} elseif ($exitCode -eq 4) {
    Write-Host "✗ pytest command line usage error!" -ForegroundColor Red
} elseif ($exitCode -eq 5) {
    Write-Host "⚠ No tests collected!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📁 Generated Reports:" -ForegroundColor Cyan

if (Test-Path "$reportsDir/junit.xml") {
    Write-Host "  • JUnit XML: $reportsDir/junit.xml" -ForegroundColor White
}

if ($Html -and (Test-Path "$reportsDir/test_report.html")) {
    Write-Host "  • HTML Report: $reportsDir/test_report.html" -ForegroundColor White
    Write-Host "    Open in browser: file:///$((Get-Location).Path)/$reportsDir/test_report.html" -ForegroundColor Gray
}

if ($Coverage) {
    if (Test-Path "$reportsDir/coverage_html/index.html") {
        Write-Host "  • Coverage HTML: $reportsDir/coverage_html/index.html" -ForegroundColor White
        Write-Host "    Open in browser: file:///$((Get-Location).Path)/$reportsDir/coverage_html/index.html" -ForegroundColor Gray
    }
    if (Test-Path "$reportsDir/coverage.xml") {
        Write-Host "  • Coverage XML: $reportsDir/coverage.xml" -ForegroundColor White
    }
}

if (Test-Path "$reportsDir/test_report.json") {
    Write-Host "  • JSON Report: $reportsDir/test_report.json" -ForegroundColor White
}

Write-Host ""

exit $exitCode
