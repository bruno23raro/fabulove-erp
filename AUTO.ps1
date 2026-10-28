Set-Location "$env:USERPROFILE\fabulove-erp"
$env:PLAYWRIGHT_MCP_EXTENSION_TOKEN = "WVzeJIiZ5Eut1E08LIJ8wq8jrHNG894cffTRdchxso"
New-Item -ItemType File -Force -Path ".claude\AUTOPILOT" | Out-Null
Write-Host "AUTOPILOTO ATIVO. Ctrl+C interrompe. Para desligar o auto-continue: apague .claude\AUTOPILOT" -ForegroundColor Yellow
claude --dangerously-skip-permissions --model opus
