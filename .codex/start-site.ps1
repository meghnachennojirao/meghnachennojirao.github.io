$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$port = 3000
$url = "http://localhost:$port"

function Stop-ExistingServer {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) {
        return
    }

    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } catch {
            Write-Warning "Could not stop process $processId on port $port."
        }
    }

    Start-Sleep -Seconds 1
}

function Start-Server {
    $nodeCommand = Get-Command node -ErrorAction Stop
    $logDir = Join-Path $repoRoot ".codex\logs"
    $stdoutLog = Join-Path $logDir "site.stdout.log"
    $stderrLog = Join-Path $logDir "site.stderr.log"

    New-Item -ItemType Directory -Force -Path $logDir | Out-Null

    Start-Process `
        -FilePath $nodeCommand.Source `
        -ArgumentList "server.js" `
        -WorkingDirectory $repoRoot `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -WindowStyle Hidden | Out-Null
}

function Wait-ForServer {
    for ($i = 0; $i -lt 20; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                return
            }
        } catch {
        }

        Start-Sleep -Milliseconds 500
    }

    throw "The local site did not become ready at $url."
}

Stop-ExistingServer
Start-Server
Wait-ForServer
Start-Process $url
