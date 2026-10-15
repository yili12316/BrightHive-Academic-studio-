$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
  $nodePath = $nodeCommand.Source
} else {
  $nodePath = 'C:\Users\yx590\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}

if (-not (Test-Path -LiteralPath $nodePath)) {
  Write-Host '找不到 Node.js，网站服务器无法启动。' -ForegroundColor Red
  Write-Host '请安装 Node.js，或通过 Codex 启动网站。'
  Read-Host '按 Enter 关闭此窗口' | Out-Null
  exit 1
}

$stdoutPath = Join-Path $env:TEMP 'good-start-academy-server.log'
$stderrPath = Join-Path $env:TEMP 'good-start-academy-server-error.log'
Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue

try {
  $server = Start-Process -FilePath $nodePath `
    -ArgumentList @('local-server.js') `
    -WorkingDirectory $siteRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -PassThru

  $url = $null
  for ($attempt = 0; $attempt -lt 50; $attempt++) {
    Start-Sleep -Milliseconds 200
    if (Test-Path -LiteralPath $stdoutPath) {
      $match = Select-String -LiteralPath $stdoutPath -Pattern 'http://127\.0\.0\.1:(\d+)/' | Select-Object -First 1
      if ($match) {
        $url = $match.Matches[0].Value.TrimEnd('/') + '/index.html'
        break
      }
    }
    if ($server.HasExited) { break }
  }

  if (-not $url) {
    $details = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { '' }
    if (-not $details) { $details = '网站服务没有在 10 秒内启动。' }
    Write-Host "网站启动失败：$details" -ForegroundColor Red
    Read-Host '按 Enter 关闭此窗口' | Out-Null
    exit 1
  }

  $responding = $false
  for ($attempt = 0; $attempt -lt 15; $attempt++) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
      if ($response.StatusCode -eq 200) { $responding = $true; break }
    } catch {
      Start-Sleep -Milliseconds 300
    }
  }

  if (-not $responding) {
    Write-Host "服务器已启动，但网页没有响应：$url" -ForegroundColor Red
    Read-Host '按 Enter 关闭此窗口' | Out-Null
    exit 1
  }

  Write-Host "网站已启动：$url" -ForegroundColor Green
  Start-Process -FilePath $url
} catch {
  Write-Host "网站启动失败：$($_.Exception.Message)" -ForegroundColor Red
  Read-Host '按 Enter 关闭此窗口' | Out-Null
  exit 1
}
