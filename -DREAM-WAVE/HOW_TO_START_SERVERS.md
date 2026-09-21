# 🚀 How to Start Frontend and Backend Servers

## ⚠️ IMPORTANT: Node.js Required

**Before you can run the servers, you need Node.js installed!**

### Check if Node.js is Installed

Open Command Prompt and run:
```bash
node --version
npm --version
```

**If you see version numbers:** ✅ You're ready to go!  
**If you see "not recognized":** ❌ You need to install Node.js first

---

## 📥 Install Node.js (If Not Installed)

1. **Download:** Go to https://nodejs.org/
2. **Choose:** LTS version (recommended)
3. **Install:** Run the installer
4. **Important:** ✅ Check "Add to PATH" during installation
5. **Restart:** Restart your computer
6. **Verify:** Open new terminal and run `node --version`

---

## 🎯 Method 1: Use the Batch File (Easiest)

### Start Both Servers at Once

1. **Navigate to project folder:**
   ```
   D:\DREAM WAVE\AA Dream Wavve\trailer 3
   ```

2. **Double-click this file:**
   ```
   START_APP.bat
   ```

3. **Wait for servers to start** (takes 10-30 seconds)

4. **Open your browser:**
   ```
   http://localhost:5173
   ```

**That's it!** ✅

---

## 🎯 Method 2: Manual Command Line

### Start Both Servers Together

1. **Open Command Prompt**

2. **Navigate to project:**
   ```bash
   cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3"
   ```

3. **Run:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   ```
   http://localhost:5173
   ```

---

## 🎯 Method 3: Start Servers Separately

### Terminal 1 - Backend Server

```bash
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3\server"
npm run dev
```

**Backend will run on:** http://localhost:5001

### Terminal 2 - Frontend Server

```bash
cd "D:\DREAM WAVE\AA Dream Wavve\trailer 3\client"
npm run dev
```

**Frontend will run on:** http://localhost:5173

---

## 📊 What You Should See

### When Servers Start Successfully:

**Backend (Terminal 1):**
```
Server running on port 5001
Connected to MongoDB
✓ Backend ready
```

**Frontend (Terminal 2):**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### In Your Browser:

- ✅ Application loads at http://localhost:5173
- ✅ No CORS errors in console (F12)
- ✅ All pages work correctly
- ✅ Report page loads without errors

---

## 🛑 How to Stop the Servers

### If using START_APP.bat:
- Press `Ctrl + C` in the terminal
- Type `Y` and press Enter

### If running manually:
- Press `Ctrl + C` in each terminal
- Type `Y` and press Enter

---

## 🐛 Troubleshooting

### Problem: "npm is not recognized"

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart your computer
3. Open a NEW terminal
4. Try again

---

### Problem: "Port already in use"

**Solution:**

**For port 5173 (frontend):**
```bash
netstat -ano | findstr :5173
taskkill /PID <PID_NUMBER> /F
```

**For port 5001 (backend):**
```bash
netstat -ano | findstr :5001
taskkill /PID <PID_NUMBER> /F
```

---

### Problem: "Cannot find module"

**Solution:**
```bash
# Install dependencies
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

Or just run:
```
INSTALL_DEPENDENCIES.bat
```

---

### Problem: Server starts but browser shows error

**Check:**
1. Is backend running? (http://localhost:5001)
2. Is frontend running? (http://localhost:5173)
3. Check browser console (F12) for errors
4. Check terminal for error messages

**Solution:**
1. Stop both servers (Ctrl + C)
2. Run `CLEANUP_SCRIPT.bat`
3. Run `START_APP.bat` again

---

## ✅ Success Checklist

Before starting servers:
- [ ] Node.js installed (`node --version` works)
- [ ] npm installed (`npm --version` works)
- [ ] Dependencies installed (`node_modules` folders exist)
- [ ] No duplicate folders (run `CLEANUP_SCRIPT.bat`)
- [ ] Report.jsx has no errors

After starting servers:
- [ ] Backend running on port 5001
- [ ] Frontend running on port 5173
- [ ] Browser opens to http://localhost:5173
- [ ] No errors in browser console (F12)
- [ ] Application loads correctly

---

## 🎯 Quick Reference

| Action | Command |
|--------|---------|
| Start both servers | `START_APP.bat` or `npm run dev` |
| Start frontend only | `START_CLIENT.bat` or `cd client && npm run dev` |
| Start backend only | `cd server && npm run dev` |
| Stop servers | `Ctrl + C` |
| Check if running | Open http://localhost:5173 |
| View logs | Check terminal output |
| View frontend errors | Browser console (F12) |

---

## 🌐 URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5001 |
| API | http://localhost:5001/api |

---

## 💡 Pro Tips

1. **Always use the dev server** - Never open HTML files directly
2. **Keep terminals open** - Don't close them while developing
3. **Check console** - Press F12 in browser to see errors
4. **Restart if needed** - Stop servers (Ctrl+C) and start again
5. **Use START_APP.bat** - Easiest way to start everything

---

## 🎉 You're Ready!

Once Node.js is installed:

1. **Double-click:** `START_APP.bat`
2. **Wait:** 10-30 seconds for servers to start
3. **Open:** http://localhost:5173
4. **Enjoy:** Your application is running!

---

## 📚 More Help

- **Installation issues:** See `🚨_IMPORTANT_READ_THIS.txt`
- **General problems:** See `TROUBLESHOOTING.md`
- **Quick reference:** See `QUICK_REFERENCE.txt`
- **Complete guide:** See `🚀_FINAL_TESTED_GUIDE.md`

---

**Everything is ready - just need Node.js installed!** 🚀
