param(
    [int]$Port = 3000,
    [string]$Path = "/",
    [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$normalizedPath = if ([string]::IsNullOrWhiteSpace($Path)) { "/" } elseif ($Path.StartsWith("/")) { $Path } else { "/$Path" }
$url = "http://localhost:$Port$normalizedPath"

function Stop-ExistingServer {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) {
        return
    }

    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } catch {
            Write-Warning "Could not stop process $processId on port $Port."
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

    $originalPort = $env:PORT
    $env:PORT = "$Port"

    Start-Process `
        -FilePath $nodeCommand.Source `
        -ArgumentList "server.js" `
        -WorkingDirectory $repoRoot `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -WindowStyle Hidden | Out-Null

    if ($null -eq $originalPort) {
        Remove-Item Env:PORT -ErrorAction SilentlyContinue
    } else {
        $env:PORT = $originalPort
    }
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
if (-not $NoOpen) {
    Start-Process $url
}
