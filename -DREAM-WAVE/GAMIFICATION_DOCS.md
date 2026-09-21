# Krishna AI Gamification System - Documentation

## Overview
The Krishna AI Gamification System adds an advanced achievement and progression system to motivate users to complete daily tasks, build discipline, and achieve their goals.

## Features Implemented

### 1. ✅ Streak System
- **Smart Tracking**: Streak increases only when user completes ALL daily tasks
- **Warning System**: Miss 1 day → warning, miss 2+ days → streak resets
- **Daily Reset**: Automatically resets on new day
- **Storage**: Persistent in localStorage

Example: User completes 5 days straight → Streak = 5

### 2. ⭐ Level System
**Progression Rules:**
- Levels 1-5: Requires 5-day streak per level
- Levels 6-10: Requires 7-day streak per level  
- Levels 11+: Requires 10-day streak per level (hard mode)

Example: Achieve 5-day streak → Level 2

### 3. 📊 XP (Experience) System
**XP Rewards:**
- Each completed task: +10 XP
- Full day completion: +50 XP bonus
- Total XP tracked for certificates

**XP to Level Up:**
```
Level 1 → 100 XP
Level 2 → 200 XP
Level 3 → 300 XP
Level 4 → 400 XP
Level 5 → 500 XP
Level 6 → 700 XP
Level 7 → 900 XP
Level 8 → 1100 XP
... and so on
```

Progress Bar: Shows current XP / Required XP visually

### 4. 🏆 Certificate System
- **Milestone**: Every 10 levels completed
- **Design**: Krishna-themed certificate with user name, level, and date
- **Print**: Users can print their certificates
- **Unlock**: Certificate button appears at Level 10

### 5. 🪷 Krishna Motivation Engine
**Dynamic Messages Triggered By:**
- Streak increases: Wisdom-based motivation
- Level up: Achievement blessing
- Certificate unlock: Celebration message

Examples:
- "🪷 Your discipline grows. Continue your dharma."
- "🏆 Through disciplined action, mastery unfolds. Level 5!"
- "🪷 You have evolved to a higher plane. Level 10 achieved!"

### 6. 📱 UI Components

**Gamification Widget shows:**
- 🔥 Current Streak (0-999)
- ⭐ Current Level (1-15+)
- 📊 XP Progress Bar with percentage
- 🏆 Certificate button (when eligible)
- 💬 Motivation message (temporary)

**Daily Tasks Panel:**
- ✓ 6 predefined daily tasks
- Interactive checkboxes
- XP earned per task (+10 each)
- Completion tracker (e.g., 3/6 complete)
- "Complete Day" button awarding 50 XP bonus

## Data Persistence

All data stored in **localStorage** (auto-saved):

```javascript
localStorage['krishna_progression'] = {
  streak: 5,
  level: 3,
  xp: 150,
  completedTasks: [...],
  lastCompletedDate: "2026-03-27T10:00:00Z",
  certificatesEarned: [{level: 10, earnedDate: "..."}],
  totalXpGained: 1250
}

localStorage['daily_tasks_' + today] = {
  {id: 1, name: "Morning Meditation", completed: true, xp: 10},
  {id: 2, name: "Read Sacred Text", completed: false, xp: 10},
  ...
}
```

## How to Use

### For End Users:

1. **View Progress**: Open Krishna AI Mentor
   - See current Level, Streak, XP in the gamification widget

2. **Complete Daily Tasks**:
   - Check off completed tasks (6 tasks available)
   - Earn +10 XP per task
   - Complete all 6 → Unlock +50 XP bonus button

3. **Build Streak**:
   - Complete all tasks every day
   - Streak increases by 1 per day
   - Miss a day → warning
   - Miss 2+ days → streak resets

4. **Level Up**:
   - Accumulate XP from tasks
   - Hit required XP threshold → automatic level up
   - Also need required streak (increases after level 5)

5. **Earn Certificate**:
   - Reach Level 10 to unlock certificate
   - Click "🏆 View Certificate" button
   - Print or take screenshot of certificate

### For Developers:

**Add XP for custom actions:**
```javascript
GAMIFICATION.addXP(10, "Task Name");  // +10 XP
```

**Update UI after completion:**
```javascript
updateGamificationWidget();  // Refresh display
```

**Show motivation message:**
```javascript
showGamificationMessage("Custom message here!");
```

**Complete daily tasks (triggers streak):**
```javascript
completeAllDailyTasks_UI();  // Full day completion
```

**Get current progression data:**
```javascript
const prog = GAMIFICATION.getProgressData();
console.log(prog.level, prog.streak, prog.xp);
```

## File Structure

- `frontend/gamification.js` - Core logic (streaks, levels, XP, certificates)
- `frontend/gamification.css` - Styling for widgets and modals
- `frontend/krishna.html` - Integration point (widgets, modals, daily tasks)
- `frontend/daily-tasks-tracker.html` - Standalone reference (included in krishna.html)

## Technical Details

### Streak Validation Logic:
```
TODAY = completed ALL tasks
YESTERDAY = was a completion day
DAY_DIFF = days since last completion

If DAY_DIFF == 0:     → No change (already completed today)
If DAY_DIFF == 1:     → Streak +1 (continue streak)
If DAY_DIFF == 2:     → Warning + Streak -1 (at risk)
If DAY_DIFF >= 3:     → Streak reset to 0
```

### XP to Level Conversion:
```
Current XP accumulates → When XP >= Required XP:
  Level += 1
  XP = 0 (reset for new level)
  If Level % 10 == 0 → Certificate earned
```

### Streak to Level Requirement:
```
If Level <= 5:       Need 5-day streak
Else if Level <= 10: Need 7-day streak
Else:                Need 10-day streak (hard mode)
```

## CSS Variables Used

- `--grad-primary`: Gold gradient (#f5c842 → #ffd700)
- `--text-accent`: #f5c842 (gold)
- `--text-muted`: #8878b0 (purple)
- `--bg-dark`: #0a0a1a (dark background)
- `--border`: rgba(167,139,250,0.3) (purple border)

## Browser Compatibility

- ✅ Chrome, Firefox, Safari, Edge (modern versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ localStorage support required

## Future Enhancements

1. **Social Leaderboard**: Compare streaks with friends
2. **Achievement Badges**: Special badges for milestones
3. **Customizable Tasks**: Users create their own daily tasks
4. **Reward Redemption**: Use points for premium features
5. **Analytics Dashboard**: View progress charts and insights
6. **Notifications**: Push notifications for daily reminders

## Notes

- All data is client-side (localStorage)
- No server-side tracking (privacy-first)
- Resets daily at midnight (based on local timezone)
- Streaks persist across browser sessions
- Certificates are client-side (no backend storage)

---

**Created**: March 27, 2026
**Version**: 1.0 (Krishna AI Gamification System)
**Status**: Production Ready ✅
