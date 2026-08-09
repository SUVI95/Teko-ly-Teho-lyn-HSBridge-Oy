# Claude Mastery Prompt Cheat Sheet

This cheat sheet compiles all the exact prompts used across the **Seven Secret Pillars of Claude Mastery** as detailed in the video. Each prompt is optimized for its specific tool within the Claude ecosystem.

---

## 🛠️ Pillar 1: Co-Work (Desktop Version)
*Co-Work allows Claude to interact directly with your local files and folders—reading, editing, and creating files automatically.*

### Prompt 1: Research & Excel Sheet Generation
Use this to have Claude conduct web research and generate a formatted spreadsheet directly in your connected folder.
```text
Research the best travel camera under $1,500 and build that into an Excel sheet.
```

### Prompt 2: Messy Folder Organization
Use this to clean up and structure a cluttered local folder automatically.
```text
Organize this messy folder by sectioning the files out into different subfolders so I can always find what I need fast.
```

---

## 📲 Pillar 2: Dispatch (Mobile-to-PC Automation)
*Dispatch lets you send requests from Claude's mobile app, which routes to your active home computer to run file-level actions and text you the results.*

### Prompt 3: Remote Contract Review & Edit
Run this on your phone to trigger a document search, modification, and SMS notification from your desktop.
```text
Open up a contract in my work folder, check it for any renewal date and any hidden fees, add our new clauses, and text me back exactly what you find.
```

---

## 🧩 Pillar 3: Co-Work Artifacts (Interactive Web Apps)
*Unlike normal snapshots, Co-Work Artifacts stay connected to your live data, maintain full version histories, and are pinned to your sidebar.*

### Prompt 4: Interactive Monthly Budget App
Create an interactive, self-thinking tool with calculations and custom spending category modifications.
```text
Build an interactive monthly budget tool where I type in my income and it shows me what I can save each month.
```

---

## 🎨 Pillar 4: Claude Design
*Claude Design creates professional, highly-editable design assets and website mockups using visual style references.*

### Prompt 5: Apple-Aesthetic Landing Page
Provide reference screenshots (e.g., Apple website) and use this prompt to generate a fully editable, on-brand layout.
```text
Build a landing page for my email list in the same style as the attached screenshots ensuring it follows a traditional landing page layout, features high-converting copy, and uses purple as the accent color.
```

---

## 🔌 Pillar 5: Plugins & Connectors
*Connectors let Claude command third-party applications (like Google Calendar and Notion) to create, read, and edit workspace contents.*

### Prompt 6: Google Calendar - Find & Block Time
```text
Find me a free 2-hour block before Friday and add a time block to work on next week's content.
```

### Prompt 7: Notion - Web Research to Structured Database Page
```text
Go online, research the best weekly meal plan for muscle growth, and add it as a page in my workspace formatted nicely.
```

---

## 🔑 Pillar 6: Skills & Scheduled Tasks
*Skills let you package complex, multi-step procedures with strict standards so Claude can execute them instantly without manual re-prompting.*

### Prompt 8: Packaging the "Red Flag Checker" Skill
Run this in a new chat to build and save your custom skill.
```text
Create a skill to review agreements, checking whether they're risky, contain unusual clauses, or are missing critical information.
```

### Prompt 9: Running Your Saved Skill
Once the skill is saved, trigger it instantly on any uploaded document.
```text
Run the red flag checker on it.
```

### Prompt 10: Automating via Scheduled Tasks (Daily Folder Scan)
Configure a daily task (e.g., daily at 10:00 AM) to run automatically without prompting.
*   **Task Name:** `Daily Review`
*   **Task Description Prompt:**
    ```text
    Review the agreements in the agreement folder using the red flag checker skill.
    ```

---

## 💻 Pillar 7: Claude Code
*Claude Code builds fully functional, running applications where the buttons and backend logic actually work, rather than just look good.*

### Prompt 11: Minimalist Habit Tracker Desktop App
Use this to generate a fully coded, interactive local application.
```text
Build a simple habit tracker I can run on my computer where I can add habits, check them off daily, and see my streaks. Keep it clean and minimal.
```
