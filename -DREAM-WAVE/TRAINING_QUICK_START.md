# 🚀 AI TRAINING SYSTEM — QUICK START GUIDE

## ⚡ 5-Minute Setup

### **Prerequisites:**
- Node.js installed
- MongoDB running
- OpenAI API key set in `.env`

### **Start the System:**

```bash
# Terminal 1 — Backend
cd dream-wave-ai/server
npm install
npm start
# Server runs on http://localhost:5001

# Terminal 2 — Frontend
cd dream-wave-ai/client
npm install
npm run dev
# Client runs on http://localhost:5173
```

---

## 🎯 USER FLOW (Step-by-Step)

### **Step 1: Register/Login**
```
1. Go to http://localhost:5173
2. Click "Register" or "Login"
3. Create account or sign in
```

### **Step 2: Create a Goal**
```
1. Navigate to "My Goals" in sidebar
2. Click "Create Goal"
3. Enter:
   - Title: "Become a Full Stack Developer"
   - Category: "career"
   - Description: (optional)
4. Click "Create Goal"
5. Wait 20-30 seconds for AI to generate roadmap
```

### **Step 3: Start Training**
```
1. Navigate to "Training" in sidebar (under AI Engine)
2. Select your goal from dropdown
3. Click "Start Training"
4. System initializes skill queue from roadmap
```

### **Step 4: Day 1 — LEARN**
```
1. Click "Load Day 1 Content"
2. AI generates learning content (theory, PDF, PPT, animation)
3. Explore all tabs:
   - Theory: Core concepts with examples
   - PDF: Study guide outline
   - PPT: Presentation outline
   - Animation: Step-by-step visual explanation
4. Complete practice exercises
5. Click "Complete Day 1 — Move to Test"
```

### **Step 5: Day 2 — TEST**
```
1. System loads quiz (5 MCQ + 2 open questions)
2. Answer all questions
3. Click "Submit Test"
4. View score (need 70% to pass)
5. Read explanations
6. Click "Move to Practice"
```

### **Step 6: Day 3 — PRACTICE**
```
1. System loads mini project
2. Read requirements and steps
3. Build the project following the guide
4. Check off submission checklist items
5. Click "Project Complete! Move to Revision"
```

### **Step 7: Day 4 — REVISE**
```
1. System loads revision content
2. Review key takeaways
3. Flip through flashcards
4. Read quick recap
5. Study common mistakes
6. Click "Revision Complete! Advance to Next Skill"
```

### **Step 8: Day 5 — ADVANCE**
```
1. System shows skill completion celebration
2. Certificate is auto-generated
3. Resume is auto-updated (background)
4. Click "Start Next Skill"
5. System moves to next skill in queue
6. Cycle repeats from Day 1
```

### **Step 9: View Certificates**
```
1. Navigate to "Certificates" in sidebar
2. See all earned certificates
3. Each certificate shows:
   - Skill name
   - Goal title
   - Issue date
   - Unique certificate ID
```

### **Step 10: Build Resume**
```
1. Navigate to "Resume Builder" in sidebar
2. Click "Build Resume"
3. System generates ATS-friendly resume from:
   - Completed skills
   - Completed projects
   - Total days of learning
4. Download or share resume
```

---

## 🎨 VISUAL GUIDE

### **Training Dashboard:**
```
┌─────────────────────────────────────────────────────┐
│ 🎓 AI Training System                               │
│ Day 2 — Test | Skill 1/5                           │
│ Current Skill: HTML                                 │
│ Progress: ████████░░░░░░░░░░ 40%                   │
│                                                     │
│ Skill Queue:                                        │
│ [✓ HTML] [▶ CSS] [JavaScript] [React] [Node.js]   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 🧠 Knowledge Test                           │   │
│ │ 5 Questions · Pass: 70% · ⏱ 30 min         │   │
│ │                                             │   │
│ │ Q1. What is HTML?                           │   │
│ │ ○ A. Hypertext Markup Language ✓            │   │
│ │ ○ B. High Tech Modern Language              │   │
│ │ ○ C. Home Tool Making Language              │   │
│ │ ○ D. None of the above                      │   │
│ │                                             │   │
│ │ [Submit Test (5/5 answered)]                │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### **Certificates Page:**
```
┌─────────────────────────────────────────────────────┐
│ 🏆 Your Certificates                                │
│ 3 skills mastered                                   │
│                                                     │
│ ┌──────────────────┐  ┌──────────────────┐        │
│ │ 🏅 HTML          │  │ 🏅 CSS           │        │
│ │ Full Stack Dev   │  │ Full Stack Dev   │        │
│ │ Issued: Jan 15   │  │ Issued: Jan 19   │        │
│ │ ID: DW-123-ABC   │  │ ID: DW-124-DEF   │        │
│ └──────────────────┘  └──────────────────┘        │
│                                                     │
│ [🎓 Continue Training →]                           │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 TROUBLESHOOTING

### **Issue: "Training not started" error**
**Solution:** Make sure you have a roadmap generated first.
```
1. Go to "My Goals"
2. Check if your goal has "Roadmap Generated: ✓"
3. If not, wait 20-30 seconds after goal creation
4. Refresh the page
5. Try starting training again
```

### **Issue: "Failed to load content"**
**Solution:** Check OpenAI API key and quota.
```
1. Verify OPENAI_API_KEY in server/.env
2. Check OpenAI account has credits
3. Check server logs for errors
4. Retry loading content
```

### **Issue: Quiz not submitting**
**Solution:** Answer all questions first.
```
1. Make sure all questions are answered
2. Check network connection
3. If still failing, quiz calculates locally
4. You can still proceed to next day
```

### **Issue: No skills in training**
**Solution:** Regenerate roadmap.
```
1. Go to "My Goals"
2. Click on your goal
3. Click "Regenerate Roadmap"
4. Wait for new roadmap
5. Start training again
```

---

## 📊 EXPECTED TIMELINE

### **For a typical goal (e.g., "Become a Web Developer"):**

```
Roadmap Generation:     20-30 seconds
Skills Generated:       5-8 skills
Total Training Days:    20-32 days (4 days per skill)
Certificates Earned:    5-8 certificates
Resume Built:           Automatically after each skill

Example Timeline:
- Day 1-4:   HTML (Learn → Test → Practice → Revise)
- Day 5-8:   CSS
- Day 9-12:  JavaScript
- Day 13-16: React
- Day 17-20: Node.js
- Day 21-24: MongoDB
- Day 25-28: Projects
- Day 29-32: Deployment

Total: 32 days to job-ready
```

---

## 🎯 SUCCESS INDICATORS

### **You're on the right track if:**
✅ Roadmap generates within 30 seconds
✅ Skills appear in training queue
✅ Day 1 content loads with theory, PDF, PPT, animation
✅ Day 2 quiz has 5 questions
✅ Day 3 project has step-by-step guide
✅ Day 4 revision has flashcards
✅ Certificate appears after Day 4
✅ System auto-advances to next skill
✅ Progress bar updates after each day
✅ Certificates page shows earned certificates

---

## 🚀 ADVANCED USAGE

### **Multiple Goals:**
```
1. Create multiple goals (e.g., "Learn Python", "Master React")
2. Each goal has its own skill queue
3. Switch between goals in training dropdown
4. Progress is tracked separately for each goal
```

### **Custom Learning Pace:**
```
- Complete multiple days in one session
- Take breaks between skills
- Revisit previous days anytime
- System remembers your progress
```

### **Certificate Collection:**
```
- Earn certificates for each skill
- View all certificates in one place
- Each certificate has unique ID
- Certificates are permanent
```

### **Resume Building:**
```
- Resume auto-updates after each skill
- Add custom sections manually
- Download as PDF (future feature)
- Share with employers
```

---

## 📞 SUPPORT

### **Need Help?**
- Check `TRAINING_SYSTEM_COMPLETE.md` for technical details
- Review server logs for errors
- Verify environment variables
- Ensure MongoDB is running
- Check OpenAI API quota

### **Common Questions:**

**Q: How long does each day take?**
A: Day 1 (2 hours), Day 2 (30 min), Day 3 (1-2 hours), Day 4 (45 min)

**Q: Can I skip days?**
A: No, the system enforces sequential completion for effective learning.

**Q: What if I fail the quiz?**
A: You can still proceed, but review the explanations to improve.

**Q: How many skills per goal?**
A: Typically 5-8 skills, depending on the goal complexity.

**Q: Can I add custom skills?**
A: Not yet, but you can create a new goal with specific skills.

---

## ✅ CHECKLIST

Before starting training, ensure:
- [ ] Backend running on port 5001
- [ ] Frontend running on port 5173
- [ ] MongoDB connected
- [ ] OpenAI API key set
- [ ] User account created
- [ ] Goal created
- [ ] Roadmap generated (wait 20-30 seconds)
- [ ] Skills visible in roadmap

---

## 🎉 YOU'RE READY!

The AI Training System is now fully operational. Follow the steps above to start your learning journey!

**Remember:**
- Be patient during AI generation (20-30 seconds)
- Complete all 4 days for each skill
- Earn certificates as you progress
- Build your resume automatically
- Enjoy the journey! 🚀

---

**Happy Learning! 🎓**
