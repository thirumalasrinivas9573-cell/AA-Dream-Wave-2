# 🔧 Troubleshooting Guide

## Quick Diagnostics

**Run this first to check your setup:**
```
TEST_SETUP.bat
```

This will check:
- Node.js and npm installation
- Project structure
- Dependencies
- Duplicate folders
- File integrity

---

## Common Issues & Solutions

### 1. "Node.js is not installed" Error

**Problem:** Node.js is not installed on your system

**Solution:**
1. Download Node.js from: https://nodejs.org/
2. Install the LTS (Long Term Support) version
3. Restart your terminal/command prompt
4. Run `node --version` to verify

---

### 2. "npm is not recognized" Error

**Problem:** npm is not in your system PATH

**Solution:**
1. Reinstall Node.js (it includes npm)
2. Make sure to check "Add to PATH" during installation
3. Restart your computer
4. Open a new terminal and try again

---

### 3. Dependencies Not Installed

**Problem:** `node_modules` folders are missing

**Solution:**
```
Run: INSTALL_DEPENDENCIES.bat
```

Or manually:
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..

# Install server dependencies
cd server
npm install
cd ..
```

---

### 4. Port Already in Use

**Problem:** Error says port 5173 or 5001 is already in use

**Solution:**

**Option 1: Kill the process using the port**
```bash
# For port 5173 (frontend)
netstat -ano | findstr :5173
taskkill /PID <PID_NUMBER> /F

# For port 5001 (backend)
netstat -ano | findstr :5001
taskkill /PID <PID_NUMBER> /F
```

**Option 2: Change the port**

Edit `client/vite.config.js`:
```javascript
server: {
  port: 3000,  // Change from 5173 to 3000
  // ...
}
```

Edit `server/server.js`:
```javascript
const PORT = process.env.PORT || 5002;  // Change from 5001
```

---

### 5. CORS Errors Still Appearing

**Problem:** Still seeing CORS errors in browser console

**Checklist:**
- ✅ Are you using `http://localhost:5173` (not `file://`)?
- ✅ Is the Vite dev server running?
- ✅ Did you start the server with `START_APP.bat` or `START_CLIENT.bat`?
- ✅ Check browser console for the actual error message

**Solution:**
1. Close all browser tabs
2. Stop all running servers (Ctrl+C)
3. Run `START_APP.bat` again
4. Open a fresh browser tab to `http://localhost:5173`

---

### 6. Report.jsx Still Has Errors

**Problem:** Report page shows errors or doesn't load

**Solution:**
```
Run: CLEANUP_SCRIPT.bat
```

This will:
1. Backup the corrupted file
2. Replace it with the clean version
3. Fix all 156 syntax errors

**Manual fix:**
```bash
copy client\src\pages\Report_CLEAN.jsx client\src\pages\Report.jsx
```

---

### 7. "Cannot find module" Errors

**Problem:** Import errors in the console

**Common causes:**
- Missing dependencies
- Incorrect import paths
- Case-sensitive file names

**Solution:**
```bash
# Reinstall dependencies
npm install
cd client && npm install
cd ../server && npm install
```

---

### 8. Cleanup Script Fails

**Problem:** CLEANUP_SCRIPT.bat shows errors

**Solution:**

**Option 1: Run as Administrator**
1. Right-click `CLEANUP_SCRIPT.bat`
2. Select "Run as Administrator"

**Option 2: Close all programs**
1. Close VS Code or any editor
2. Close all terminals
3. Close File Explorer windows
4. Run the script again

**Option 3: Manual cleanup**
```bash
# Backup Report.jsx
copy client\src\pages\Report.jsx client\src\pages\Report.jsx.backup

# Replace with clean version
copy client\src\pages\Report_CLEAN.jsx client\src\pages\Report.jsx

# Remove duplicates (one at a time)
rmdir /s /q dream-wave-ai
rmdir /s /q safe-ui
rmdir /s /q public
```

---

### 9. Server Won't Start

**Problem:** Backend server fails to start

**Check:**
1. Is MongoDB running? (if you use MongoDB)
2. Are environment variables set? (check `server/.env`)
3. Is port 5001 available?

**Solution:**
```bash
# Check server logs
cd server
npm run dev
# Read the error message
```

Common fixes:
- Install missing packages: `cd server && npm install`
- Check `.env` file exists: `copy .env.example .env`
- Update database connection string in `.env`

---

### 10. Client Won't Start

**Problem:** Frontend fails to start

**Solution:**
```bash
# Clear cache and reinstall
cd client
rmdir /s /q node_modules
rmdir /s /q dist
del package-lock.json
npm install
npm run dev
```

---

### 11. "Module not found: Can't resolve" Error

**Problem:** Vite can't find imported modules

**Common causes:**
- Wrong import path
- Missing file extension
- Case sensitivity

**Solution:**
1. Check the import path is correct
2. Verify the file exists
3. Match the exact case (Report.jsx vs report.jsx)

Example fix:
```javascript
// Wrong
import Report from './pages/report'

// Correct
import Report from './pages/Report.jsx'
```

---

### 12. White Screen / Blank Page

**Problem:** Browser shows blank page

**Check:**
1. Open browser console (F12)
2. Look for error messages
3. Check Network tab for failed requests

**Common solutions:**
- Clear browser cache (Ctrl+Shift+Delete)
- Check if API server is running
- Verify `.env` file has correct API URL

---

### 13. Hot Reload Not Working

**Problem:** Changes don't appear automatically

**Solution:**
1. Save the file (Ctrl+S)
2. Check terminal for errors
3. Restart the dev server
4. Clear browser cache

---

### 14. Build Fails

**Problem:** `npm run build` fails

**Solution:**
```bash
cd client

# Clear previous build
rmdir /s /q dist

# Try building again
npm run build

# If it fails, check for:
# - Syntax errors in code
# - Missing dependencies
# - Environment variables
```

---

## Environment Variables

### Client (.env)
```env
VITE_API_URL=http://localhost:5001/api
```

### Server (.env)
```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
OPENAI_API_KEY=your_openai_key
```

---

## Verification Checklist

After fixing issues, verify:

- [ ] `node --version` works
- [ ] `npm --version` works
- [ ] `node_modules` exists in root, client, and server
- [ ] No duplicate folders (dream-wave-ai, safe-ui, public)
- [ ] Report.jsx has no errors
- [ ] `START_APP.bat` runs without errors
- [ ] Frontend opens at http://localhost:5173
- [ ] Backend responds at http://localhost:5001
- [ ] No CORS errors in browser console
- [ ] Report page loads correctly

---

## Getting More Help

### Check Logs

**Frontend logs:**
- Look at the terminal where you ran `START_CLIENT.bat`
- Check browser console (F12 → Console tab)

**Backend logs:**
- Look at the terminal where you ran `START_APP.bat`
- Check for error messages in red

### Useful Commands

```bash
# Check what's running on a port
netstat -ano | findstr :5173

# Kill a process
taskkill /PID <PID> /F

# Clear npm cache
npm cache clean --force

# Reinstall everything
rmdir /s /q node_modules
del package-lock.json
npm install
```

---

## Still Having Issues?

1. Run `TEST_SETUP.bat` to diagnose
2. Check the error message carefully
3. Search for the specific error online
4. Make sure all dependencies are installed
5. Try restarting your computer

---

## Quick Reset (Nuclear Option)

If nothing works, start fresh:

```bash
# 1. Backup your .env files
copy client\.env client\.env.backup
copy server\.env server\.env.backup

# 2. Remove all dependencies
rmdir /s /q node_modules
rmdir /s /q client\node_modules
rmdir /s /q server\node_modules

# 3. Remove lock files
del package-lock.json
del client\package-lock.json
del server\package-lock.json

# 4. Reinstall everything
npm install
cd client && npm install
cd ../server && npm install
cd ..

# 5. Run cleanup
CLEANUP_SCRIPT.bat

# 6. Start the app
START_APP.bat
```

This should fix 99% of issues!
