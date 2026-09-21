# 🚀 START THE REAL WEB VERSION - MANUAL INSTRUCTIONS

**Date:** 2026-08-29

---

## ✅ CONFIRMED: REAL WEB VERSION LOCATION

**Path:** `d:\-DREAM-WAVE\web\`

**Technology:** Next.js 16 + React 19

**Portals:**
- ✅ Student Portal (22+ pages)
- ✅ Institution Portal (38+ pages!)
- ✅ Company Portal (8+ pages)

---

## 🔧 MANUAL START INSTRUCTIONS

Due to PowerShell npm command issues, please start the servers manually:

### OPTION 1: Use Windows Terminal or CMD (RECOMMENDED)

1. **Open TWO terminal windows** (CMD or Windows Terminal)

2. **Terminal 1 - Backend:**
   ```cmd
   cd d:\-DREAM-WAVE\server
   node server.js
   ```
   
   Wait for: `Server running on port 5001` and `MongoDB connected`

3. **Terminal 2 - Web Frontend:**
   ```cmd
   cd d:\-DREAM-WAVE\web
   npm run dev
   ```
   
   Wait for: `ready - started server on 0.0.0.0:3000`

4. **Open Browser:**
   ```
   http://localhost:3000
   ```

---

### OPTION 2: Use Root Package.json

1. **Open ONE terminal:**
   ```cmd
   cd d:\-DREAM-WAVE
   npm run dev:web
   ```
   
   This starts BOTH backend and web frontend using concurrently.

2. **Open Browser:**
   ```
   http://localhost:3000
   ```

---

### OPTION 3: Use Batch Files

1. **Double-click:**
   ```
   d:\-DREAM-WAVE\server\start-server.bat
   ```

2. **Then double-click:**
   ```
   d:\-DREAM-WAVE\web\start-web.bat
   ```

3. **Open Browser:**
   ```
   http://localhost:3000
   ```

---

## 🌐 EXPECTED URLS

**Main:** http://localhost:3000

**Backend API:** http://localhost:5001

**Portal Routes** (based on Next.js structure):
- Student Dashboard: http://localhost:3000/dashboard
- Institution Portal: http://localhost:3000/institution
- Company Portal: http://localhost:3000/company
- Auth: http://localhost:3000/(check web/src/app/(auth) for exact routes)

---

## ✅ WEB FOLDER STRUCTURE CONFIRMED

### Student Features (22+ pages)
```
/dashboard
/goals
/tasks
/learn
/roadmap
/mentor
/reports
/research
/books
/community
/ai
/projects
/workspace
/marketplace
/opportunities
/applications
/events
/notifications
/settings
/personalization
/search
/onboarding
```

### Institution Features (38+ pages!)
```
/institution/dashboard
/institution/profile
/institution/students
/institution/faculty
/institution/departments
/institution/courses
/institution/subjects
/institution/classes
/institution/teachers
/institution/academics
/institution/placements
/institution/admissions
/institution/alumni
/institution/research
/institution/incubation
/institution/partnerships
/institution/collaboration-hub
/institution/opportunity-marketplace
/institution/campus-command-center
/institution/command-center
/institution/executive-intelligence
/institution/ecosystem
/institution/industry-network
/institution/campus
/institution/branches
/institution/college
/institution/school
/institution/programs
/institution/members
/institution/operations
/institution/announcements
/institution/gallery
/institution/events
/institution/analytics
/institution/reports
/institution/notifications
/institution/settings
/institution/help
```

### Company Features (8+ pages)
```
/company/dashboard
/company/profile
/company/recruitment
/company/partnerships
/company/collaboration-hub
/company/opportunity-marketplace
/company/institution-network
/company/ecosystem
```

---

## 🎯 WHY THIS IS THE REAL VERSION

1. ✅ **Complete portal implementations** - Not just scaffolding
2. ✅ **38+ Institution pages** - Most comprehensive implementation
3. ✅ **Next.js App Router** - Modern architecture
4. ✅ **All authentication routes** - `web/src/app/(auth)`
5. ✅ **Complete feature set** - AI, Research, Learning, etc.

---

## ⚠️ IMPORTANT NOTES

1. **Backend MUST be running first** - Web frontend needs API connection

2. **MongoDB must be accessible** - Check IP whitelist if connection fails

3. **Environment variables** - Check `web/.env.local` if needed

4. **Port conflicts** - Make sure ports 3000 and 5001 are free

---

## 🐛 TROUBLESHOOTING

### Problem: npm not recognized
**Solution:** Open regular CMD or Windows Terminal (not PowerShell in VS Code)

### Problem: MongoDB connection error
**Solution:** 
```cmd
cd d:\-DREAM-WAVE
node get-my-ip.js
```
Then add your IP to MongoDB Atlas Network Access

### Problem: Port already in use
**Solution:** Kill existing processes:
```cmd
netstat -ano | findstr :3000
netstat -ano | findstr :5001
taskkill /PID [process_id] /F
```

### Problem: Dependencies missing
**Solution:**
```cmd
cd d:\-DREAM-WAVE\web
npm install
```

---

## ✅ VERIFICATION CHECKLIST

When web server starts successfully, you should see:

```
✓ Ready in X seconds
○ Compiling /...
✓ Compiled in Xms
```

Then open http://localhost:3000 and verify:
- [ ] Page loads without errors
- [ ] Can navigate to Institution portal
- [ ] Can navigate to Company portal
- [ ] Can navigate to Student dashboard
- [ ] Backend API connection works

---

## 📊 COMPARISON: client/ vs web/

| Feature | client/ (Old) | web/ (REAL) |
|---------|---------------|-------------|
| Technology | React + Vite | Next.js 16 |
| Port | 5173 | 3000 |
| Student Pages | 31 | 22+ |
| Institution Pages | Limited | 38+ |
| Company Pages | Limited | 8+ |
| Architecture | Module-based | App Router |
| Status | ❌ Stopped | ✅ Starting |

---

## 🎉 CONCLUSION

You were absolutely right! The `web/` folder IS the real complete version with full Student/Company/Institution portal implementations.

The README was misleading - it said "foundation only" but the actual code contains complete implementations of all three portals with extensive features!

---

**Next Step:** Start the servers manually using the instructions above, then access http://localhost:3000

**Full Report:** See `REAL_WEB_VERSION_REPORT.md`

═══════════════════════════════════════════════════════
