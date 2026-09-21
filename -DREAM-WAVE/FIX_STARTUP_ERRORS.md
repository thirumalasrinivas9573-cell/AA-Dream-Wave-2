# 🔧 Fix Startup Errors - Complete Guide

## ❌ Current Issue

You're getting errors because **Node.js is not properly installed or not in your system PATH**.

Error message:
```
node : The term 'node' is not recognized as the name of a cmdlet, function, script file, or operable program.
```

---

## ✅ Solution: Install Node.js

### Step 1: Download Node.js

1. Go to: **https://nodejs.org/**
2. Download the **LTS version** (Long Term Support)
3. Choose the **Windows Installer (.msi)** - 64-bit

### Step 2: Install Node.js

1. Run the downloaded installer
2. Click **Next** through the installation wizard
3. **IMPORTANT:** Make sure "Add to PATH" is checked ✅
4. Complete the installation
5. **Restart your computer** (important!)

### Step 3: Verify Installation

Open a **NEW** Command Prompt or PowerShell and run:

```bash
node --version
npm --version
```

You should see version numbers like:
```
v18.17.0
9.6.7
```

If you still see "not recognized", restart your computer and try again.

---

## 🚀 Correct Startup Commands

Once Node.js is installed, use these commands:

### Option 1: Start Both Servers Separately (Recommended)

**Terminal 1 - Backend Server:**
```bash
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3\server"
npm start
```

**Terminal 2 - Frontend Client:**
```bash
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3\client"
npm run dev
```

### Option 2: Start Both Servers Together

From the root directory:
```bash
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3"
npm run dev
```

This will start both servers using `concurrently`.

---

## 📝 Create Easy Startup Scripts

### For Windows PowerShell

Create **`start-dev.ps1`** in the root folder:

```powershell
# Start Dream Wave AI Development Servers

Write-Host "Starting Dream Wave AI Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Start Backend Server
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\DREAM WAVE\AA Dream Wavve\trailer 3\server'; npm start"

# Wait 3 seconds
Start-Sleep -Seconds 3

# Start Frontend Server
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\DREAM WAVE\AA Dream Wavve\trailer 3\client'; npm run dev"

Write-Host ""
Write-Host "Both servers are starting!" -ForegroundColor Green
Write-Host "Backend: http://localhost:5001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this window (servers will keep running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
```

**To run:**
```powershell
powershell -ExecutionPolicy Bypass -File start-dev.ps1
```

### For Windows Command Prompt (CMD)

Create **`start-dev.bat`** in the root folder:

```batch
@echo off
echo Starting Dream Wave AI Development Servers...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d "D:\DREAM WAVE\AA Dream Wavve\trailer 3\server" && npm start"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Client" cmd /k "cd /d "D:\DREAM WAVE\AA Dream Wavve\trailer 3\client" && npm run dev"

echo.
echo Both servers are starting!
echo Backend: http://localhost:5001
echo Frontend: http://localhost:5173
echo.
pause
```

**To run:** Just double-click `start-dev.bat`

---

## 🔍 Troubleshooting

### Issue 1: "node is not recognized"

**Cause:** Node.js not installed or not in PATH

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Make sure "Add to PATH" is checked during installation
3. Restart your computer
4. Open a NEW terminal and try again

### Issue 2: "npm is not recognized"

**Cause:** Same as above - Node.js not properly installed

**Solution:** Same as Issue 1

### Issue 3: "Cannot find module"

**Cause:** Dependencies not installed

**Solution:**
```bash
# Install server dependencies
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3\server"
npm install

# Install client dependencies
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3\client"
npm install

# Install root dependencies (for concurrently)
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3"
npm install
```

### Issue 4: "Port 5001 already in use"

**Cause:** Another process is using port 5001

**Solution:**
```bash
# Find process using port 5001
netstat -ano | findstr :5001

# Kill the process (replace <PID> with actual process ID)
taskkill /PID <PID> /F
```

### Issue 5: "Port 5173 already in use"

**Cause:** Another Vite server is running

**Solution:**
```bash
# Find process using port 5173
netstat -ano | findstr :5173

# Kill the process
taskkill /PID <PID> /F
```

### Issue 6: MongoDB Connection Error

**Cause:** MongoDB credentials or connection string issue

**Solution:**
Check `server/.env` file and verify:
- MONGODB_URL is correct
- Credentials are valid
- Network allows connection to MongoDB Atlas

### Issue 7: OpenAI API Error

**Cause:** Invalid or expired API key

**Solution:**
1. Check `server/.env` file
2. Verify OPENAI_API_KEY is valid
3. Get a new key from https://platform.openai.com/api-keys if needed

---

## ✅ Verification Steps

### 1. Check Node.js Installation
```bash
node --version
npm --version
```

Expected output:
```
v18.17.0 (or higher)
9.6.7 (or higher)
```

### 2. Check Dependencies
```bash
# Check server dependencies
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3\server"
npm list --depth=0

# Check client dependencies
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3\client"
npm list --depth=0
```

### 3. Start Backend Server
```bash
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3\server"
npm start
```

Expected output:
```
✓ Server running on port 5001
✓ MongoDB connected
```

### 4. Start Frontend Client
```bash
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3\client"
npm run dev
```

Expected output:
```
VITE v4.4.5  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 5. Open in Browser
```
http://localhost:5173
```

Expected result:
- Application loads without CORS errors
- Can login and use features

---

## 📋 Complete Setup Checklist

- [ ] Node.js installed (v16 or higher)
- [ ] npm installed (comes with Node.js)
- [ ] Computer restarted after Node.js installation
- [ ] Server dependencies installed (`npm install` in server folder)
- [ ] Client dependencies installed (`npm install` in client folder)
- [ ] Root dependencies installed (`npm install` in root folder)
- [ ] `.env` file exists in server folder
- [ ] OpenAI API key is valid in `.env`
- [ ] MongoDB connection string is valid in `.env`
- [ ] Backend server starts without errors
- [ ] Frontend client starts without errors
- [ ] Application opens in browser at http://localhost:5173
- [ ] No CORS errors in browser console

---

## 🎯 Quick Start (After Node.js is Installed)

### Method 1: Using Batch File (Easiest)
1. Create `start-dev.bat` (see above)
2. Double-click `start-dev.bat`
3. Wait for both servers to start
4. Open browser to http://localhost:5173

### Method 2: Using Two Terminals
**Terminal 1:**
```bash
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3\server"
npm start
```

**Terminal 2:**
```bash
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3\client"
npm run dev
```

**Browser:**
```
http://localhost:5173
```

### Method 3: Using Concurrently (One Terminal)
```bash
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3"
npm run dev
```

---

## 🆘 Still Having Issues?

### Check System Requirements
- **Operating System:** Windows 10 or higher
- **Node.js:** v16.0.0 or higher
- **RAM:** 4GB minimum (8GB recommended)
- **Disk Space:** 2GB free space

### Check Environment Variables
1. Press `Win + R`
2. Type `sysdm.cpl` and press Enter
3. Go to "Advanced" tab
4. Click "Environment Variables"
5. Check if `C:\Program Files\nodejs\` is in PATH

### Reinstall Node.js
If nothing works:
1. Uninstall Node.js completely
2. Restart computer
3. Download fresh installer from https://nodejs.org/
4. Install with "Add to PATH" checked
5. Restart computer again
6. Try the commands again

---

## 📞 Support

If you're still having issues after following this guide:

1. **Check Node.js version:**
   ```bash
   node --version
   npm --version
   ```

2. **Check if ports are available:**
   ```bash
   netstat -ano | findstr :5001
   netstat -ano | findstr :5173
   ```

3. **Check error messages carefully** - they usually tell you what's wrong

4. **Try running commands one by one** to isolate the issue

---

## ✅ Success Indicators

You'll know everything is working when:

✅ `node --version` shows a version number
✅ `npm --version` shows a version number
✅ Backend server shows "Server running on port 5001"
✅ Frontend server shows "Local: http://localhost:5173/"
✅ Browser opens to http://localhost:5173 without errors
✅ Can login and use the application
✅ No CORS errors in browser console

---

**🎉 Once Node.js is installed and you can run the commands, you're ready to test the enhanced R&D Career Report feature!**
