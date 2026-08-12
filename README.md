# Git-Fast-Learning 🚀

> Learn Git by breaking it, not by reading about it. An interactive, in-browser Git & GitHub trainer featuring an authentic Git simulator, live animated commit DAG graphs, Git Cat mascot guidance, 100 curated Ask AI prompts, and a One Shot ⚡ visual story.

![Git-Fast-Learning Preview](https://raw.githubusercontent.com/rahulthatipam/git-fast-learning/main/preview.png)

---

## 🌟 Key Features

- 📟 **Real In-Browser Terminal & Git Simulator**  
  Type authentic Git commands. Staging area, index, working directory, and remote-tracking references update in real-time with exact Git output.

- 📈 **Dynamic Commit DAG Graph**  
  Commit nodes, branch pointers (`main`, `feature`), `HEAD`, and remote refs (`origin/main`, `upstream/main`) render dynamically as you type.

- 🐱 **Git Cat Mascot Tutor**  
  Interactive cat tutor providing real-time hints, celebratory toasts, and explanations as you clear tasks and level up your XP!

- ⚡ **One Shot Story (`story.html`)**  
  A single, top-to-bottom connected lifecycle story walking learners step-by-step through a complete real-world project: from Day 1 `git init` to multi-developer collaboration, merge conflicts, and reflog rescues.

- 🧠 **100 "What to Ask AI" Prompts (`ask-ai.html`)**  
  100 curated human questions across 10 categories (Day 1 & Silly, Staging, Branching, GitHub PRs, Rescues, Workflows, Team Reviews, Fixing Mistakes, Tags, Career Mastery) with 1-click **Copy Question 📋** buttons.

- 📖 **Searchable Command Reference (`reference.html`)**  
  Complete cheat sheet categorized by workflow with safety levels (`Safe`, `Adds History`, `Rewrites History`, `Destructive`) and quick troubleshooting solutions.

---

## 📚 Structured Learning Levels

| Level | Title | Core Concepts |
|---|---|---|
| **Level 1** | **Your First Repository** | `mkdir`, `git init`, `git status`, `git add`, `git commit`, `git diff`, `git log` |
| **Level 2** | **Branches & Merges** | `git branch`, `git checkout -b`, fast-forward merges, manual merge conflict markers |
| **Level 3** | **Forks & Pull Requests** | 3-Copy Model (Upstream/Origin/Local), `git fetch`, `git push -u`, `gh issue`, `gh pr create` |
| **Level 4** | **Rewriting & Rescues** | `git stash`, `git rebase -i`, `git commit --amend`, `git reflog`, `git checkout -b rescue`, `git revert` |

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+ Modules & OOP)
- **Styling**: Tailwind CSS + Custom Extended Design System Tokens (Modern Glassmorphism & Palette)
- **Simulation**: In-memory Git Repository Graph Simulator (`js/git-engine.js`)
- **Persistence**: Browser `localStorage` for offline progress tracking and XP gamification

---

## 🚀 Getting Started

No build tools, node packages, or server installation required! Everything runs 100% locally in your web browser.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rahulthatipam/git-fast-learning.git
   cd git-fast-learning
   ```

2. **Open in browser**:
   - Double click `index.html` or open it in Chrome, Safari, Firefox, or Edge.
   - Alternatively, serve with any local HTTP server:
     ```bash
     python3 -m http.server 8000
     ```
     Then navigate to `http://localhost:8000`.

---

## 📄 License

MIT License &copy; 2026 Rahul Thatipamula. Free for educational and open-source use.
