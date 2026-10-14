# 치이카와 마을 같이 놀기 서버를 한 번에 연다(저장소 맨 위 '서버 열기.bat' 이 이 파일을 실행한다).
#  1. 서버(http://localhost:5280)가 이미 응답하면 그대로 둔다. 꺼져 있으면 새 창에서 dotnet run 으로 켜고 응답할 때까지 기다린다.
#  2. Tailscale Funnel 이 5280 을 내보내고 있는지 보고, 아니면 연다(--bg: 터미널을 닫거나 PC 를 다시 켜도 유지된다).
#  3. 친구가 들어올 주소를 보여 준다.
# 서버 창을 닫으면 서버가 꺼진다. Funnel 을 끄려면: tailscale funnel --https=443 off

$ErrorActionPreference = 'Stop'
$port = 5280
$url = "http://localhost:$port/"
$project = Join-Path $PSScriptRoot 'TownServer'

function Test-Server {
  try { return (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri $url).Content } catch { return $null }
}

Write-Host ''
Write-Host '=== 치이카와 마을 같이 놀기 서버 ===' -ForegroundColor Yellow

# ---------- 1. 서버 ----------
$alive = Test-Server
if ($alive) {
  Write-Host "서버가 이미 켜져 있어요. ($alive)" -ForegroundColor Green
} else {
  if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host '.NET 10 SDK 가 없어요(dotnet 명령을 찾을 수 없어요). 설치한 뒤 다시 실행해 주세요.' -ForegroundColor Red
    exit 1
  }
  Write-Host '서버를 켜는 중이에요. 새 창이 열리고, 그 창을 닫으면 서버가 꺼져요.'
  Start-Process -FilePath 'dotnet' -ArgumentList @('run', '--project', "`"$project`"", '--launch-profile', 'http') -WorkingDirectory $project
  for ($i = 0; $i -lt 90 -and -not $alive; $i++) {
    Start-Sleep -Seconds 1
    $alive = Test-Server
  }
  if (-not $alive) {
    Write-Host '90초가 지나도 서버가 응답하지 않아요. 새로 열린 서버 창의 오류를 확인해 주세요.' -ForegroundColor Red
    exit 1
  }
  Write-Host "서버가 켜졌어요. ($alive)" -ForegroundColor Green
}

# ---------- 2. 친구 접속(Tailscale Funnel) ----------
if (-not (Get-Command tailscale -ErrorAction SilentlyContinue)) {
  Write-Host 'Tailscale 이 없어서 친구는 밖에서 들어올 수 없어요(이 PC 안에서 시험만 돼요).' -ForegroundColor Yellow
} else {
  $status = (& tailscale funnel status 2>&1 | Out-String)
  if ($status -match "[:/]$port\b") {
    Write-Host '친구 접속(Tailscale Funnel)도 열려 있어요.' -ForegroundColor Green
  } else {
    Write-Host 'Tailscale Funnel 을 여는 중이에요...'
    & tailscale funnel --bg $port
    $status = (& tailscale funnel status 2>&1 | Out-String)
  }
  Write-Host ''
  Write-Host $status.Trim()
  Write-Host ''
  Write-Host '위 https 주소가 게임의 서버 주소(src/net/multi.js 의 DEFAULT_SERVER)와 같으면 친구가 마을 코드로 놀러 올 수 있어요.'
}

Write-Host ''
Write-Host '준비 끝! 게임에서 마을폰, 같이 놀기, 마을 문 열기 스위치를 켜 주세요.' -ForegroundColor Green
