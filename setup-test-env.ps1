# FST Pay Quick Test Setup Script for Windows

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   FST Pay - Login/Signup Testing Setup                         ║" -ForegroundColor Cyan
Write-Host "║   Email: smburhan.personal@gmail.com                           ║" -ForegroundColor Cyan
Write-Host "║   Password: Burhan@1234                                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Color definitions
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"

# Function to test if port is open
function Test-Port {
    param([string]$host, [int]$port)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect($host, $port)
        $tcp.Close()
        return $true
    }
    catch {
        return $false
    }
}

Write-Host "Step 1: Checking Prerequisites..." -ForegroundColor $Yellow
Write-Host "=================================" -ForegroundColor $Yellow
Write-Host ""

# Check Docker
Write-Host "Checking Docker..." -NoNewline
$docker = docker --version 2>$null
if ($docker) {
    Write-Host " ✓" -ForegroundColor $Green
    Write-Host "  $docker"
} else {
    Write-Host " ✗ NOT FOUND" -ForegroundColor $Red
    Write-Host "  Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    Read-Host "  Press Enter to continue"
}
Write-Host ""

# Check Java
Write-Host "Checking Java..." -NoNewline
$java = java -version 2>&1 | Select-String "17"
if ($java) {
    Write-Host " ✓" -ForegroundColor $Green
} else {
    Write-Host " ⚠ WARNING" -ForegroundColor $Yellow
    Write-Host "  Java 17+ recommended for Spring Boot 3.3.6"
}
Write-Host ""

# Check Maven
Write-Host "Checking Maven..." -NoNewline
$maven = mvn -version 2>$null | Select-String "Apache Maven"
if ($maven) {
    Write-Host " ✓" -ForegroundColor $Green
} else {
    Write-Host " ✗ NOT FOUND" -ForegroundColor $Red
    Write-Host "  Please install Maven"
    Read-Host "  Press Enter to continue"
}
Write-Host ""

# Check Node
Write-Host "Checking Node.js..." -NoNewline
$node = node --version 2>$null
if ($node) {
    Write-Host " ✓" -ForegroundColor $Green
    Write-Host "  $node"
} else {
    Write-Host " ✗ NOT FOUND" -ForegroundColor $Red
    Write-Host "  Please install Node.js from https://nodejs.org/"
    Read-Host "  Press Enter to continue"
}
Write-Host ""

Write-Host "Step 2: Starting Services..." -ForegroundColor $Yellow
Write-Host "===========================" -ForegroundColor $Yellow
Write-Host ""

# Start PostgreSQL
Write-Host "Starting PostgreSQL (port 5434)..." -NoNewline
$db = docker run -d --name fstpay-db `
    -e POSTGRES_DB=fstpay `
    -e POSTGRES_USER=fstpay `
    -e POSTGRES_PASSWORD=fstpay123 `
    -p 5434:5432 `
    postgres:15 2>$null

if ($db) {
    Write-Host " ✓" -ForegroundColor $Green
    Start-Sleep -Seconds 3
} else {
    # Try to start existing container
    $exists = docker ps -a | Select-String "fstpay-db"
    if ($exists) {
        docker start fstpay-db 2>$null
        Write-Host " ✓ (reused)" -ForegroundColor $Green
        Start-Sleep -Seconds 3
    } else {
        Write-Host " ✗" -ForegroundColor $Red
    }
}
Write-Host ""

# Start Redis
Write-Host "Starting Redis (port 6380)..." -NoNewline
$redis = docker run -d --name fstpay-redis `
    -p 6380:6379 `
    redis:7-alpine 2>$null

if ($redis) {
    Write-Host " ✓" -ForegroundColor $Green
    Start-Sleep -Seconds 2
} else {
    # Try to start existing container
    $exists = docker ps -a | Select-String "fstpay-redis"
    if ($exists) {
        docker start fstpay-redis 2>$null
        Write-Host " ✓ (reused)" -ForegroundColor $Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host " ✗" -ForegroundColor $Red
    }
}
Write-Host ""

Write-Host "Step 3: Testing Database Connectivity..." -ForegroundColor $Yellow
Write-Host "========================================" -ForegroundColor $Yellow
Write-Host ""

# Test PostgreSQL
Write-Host "Testing PostgreSQL (localhost:5434)..." -NoNewline
$dbReady = Test-Port "localhost" 5434
if ($dbReady) {
    Write-Host " ✓" -ForegroundColor $Green
} else {
    Write-Host " ✗" -ForegroundColor $Red
    Write-Host "  Database may not be ready. Waiting..."
    Start-Sleep -Seconds 5
}
Write-Host ""

# Test Redis
Write-Host "Testing Redis (localhost:6380)..." -NoNewline
$redisReady = Test-Port "localhost" 6380
if ($redisReady) {
    Write-Host " ✓" -ForegroundColor $Green
} else {
    Write-Host " ✗" -ForegroundColor $Red
    Write-Host "  Redis may not be ready. Waiting..."
    Start-Sleep -Seconds 3
}
Write-Host ""

Write-Host "Step 4: Setting Environment Variables..." -ForegroundColor $Yellow
Write-Host "=======================================" -ForegroundColor $Yellow
Write-Host ""

# Set environment variables
$env:SPRING_DATASOURCE_PASSWORD = "fstpay123"
$env:JWT_SECRET = "fst-pay-test-secret-key-min-32-chars-long-!@#"
$env:RECAPTCHA_SECRET_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"  # Test key (always passes)
$env:RECAPTCHA_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"   # Test key
$env:MAIL_PASSWORD = "test"

Write-Host "✓ SPRING_DATASOURCE_PASSWORD = ****" -ForegroundColor $Green
Write-Host "✓ JWT_SECRET = set" -ForegroundColor $Green
Write-Host "✓ RECAPTCHA_SECRET_KEY = set (test key)" -ForegroundColor $Green
Write-Host "✓ RECAPTCHA_SITE_KEY = set (test key)" -ForegroundColor $Green
Write-Host ""

Write-Host "Step 5: Building Backend..." -ForegroundColor $Yellow
Write-Host "==========================" -ForegroundColor $Yellow
Write-Host ""

Set-Location d:\FST_Pay\backend
Write-Host "Running: mvn clean package -DskipTests"
mvn clean package -DskipTests -q

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend built successfully" -ForegroundColor $Green
} else {
    Write-Host "✗ Backend build failed" -ForegroundColor $Red
    Read-Host "Press Enter to continue"
}
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   SETUP COMPLETE - READY TO TEST                              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor $Yellow
Write-Host "===========" -ForegroundColor $Yellow
Write-Host ""
Write-Host "1. Start Backend (Terminal 1):" -ForegroundColor $White
Write-Host "   cd d:\FST_Pay\backend" -ForegroundColor Cyan
Write-Host "   java -jar target/fstpay-backend-1.0.0.jar" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Start Frontend (Terminal 2):" -ForegroundColor $White
Write-Host "   cd d:\FST_Pay\frontend" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Open Browser:" -ForegroundColor $White
Write-Host "   http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Test Credentials:" -ForegroundColor $White
Write-Host "   Email: smburhan.personal@gmail.com" -ForegroundColor Cyan
Write-Host "   Password: Burhan@1234" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Refer to Guide:" -ForegroundColor $White
Write-Host "   See LOGIN_SIGNUP_TESTING_GUIDE.md for detailed test cases" -ForegroundColor Cyan
Write-Host ""

Write-Host "Resources:" -ForegroundColor $Yellow
Write-Host "==========" -ForegroundColor $Yellow
Write-Host ""
Write-Host "📚 Testing Guide:" -ForegroundColor $White
Write-Host "   file:///d:/FST_Pay/LOGIN_SIGNUP_TESTING_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 Monitor Database:" -ForegroundColor $White
Write-Host "   psql -h localhost -p 5434 -U fstpay -d fstpay" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Monitor Redis:" -ForegroundColor $White
Write-Host "   redis-cli -p 6380" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Backend Logs:" -ForegroundColor $White
Write-Host "   Check the backend terminal for Spring Boot startup messages" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
