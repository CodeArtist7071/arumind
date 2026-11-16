param(
    [Parameter(Mandatory=$true)][string]$InputJson,
    [Parameter(Mandatory=$true)][string]$OutputXlsx
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtimeRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node'
$nodeExe = Join-Path $runtimeRoot 'bin\node.exe'
$packages = Join-Path $runtimeRoot 'node_modules'
if (!(Test-Path -LiteralPath $nodeExe) -or !(Test-Path -LiteralPath $packages)) {
    throw 'Codex bundled spreadsheet runtime is unavailable. Load workspace dependencies in Codex first.'
}
$moduleLink = Join-Path $projectRoot 'node_modules'
if (!(Test-Path -LiteralPath $moduleLink)) {
    New-Item -ItemType Junction -Path $moduleLink -Target $packages | Out-Null
}
& $nodeExe (Join-Path $projectRoot 'doc_pipeline\export_excel.mjs') $InputJson $OutputXlsx
if ($LASTEXITCODE -ne 0) { throw "Spreadsheet exporter exited with code $LASTEXITCODE. Inspect its output before using the workbook." }
