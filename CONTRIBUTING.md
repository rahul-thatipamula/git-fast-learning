# Contributing to Git-Fast-Learning 🤝

Thank you for your interest in contributing to **Git-Fast-Learning**! We welcome contributions from developers of all skill levels — whether it's adding new interactive Git tasks, improving mascot guidance, enhancing UI visual design, or fixing typos.

---

## 🚀 Step-by-Step Contribution Guide

### 1. Fork & Clone the Repository
Start by forking the repository on GitHub to your personal account:
```bash
# Clone your fork to your local machine
git clone https://github.com/YOUR_USERNAME/git-fast-learning.git
cd git-fast-learning

# Add the main repository as an upstream remote
git remote add upstream https://github.com/rahulthatipam/git-fast-learning.git
```

### 2. Create a Feature Branch
Always create a new branch for your work to keep your `main` branch clean:
```bash
git checkout -b feature/your-feature-name
```

### 3. Make Your Changes
- Keep code clean, modular, and well-commented.
- Follow existing formatting conventions (Vanilla JavaScript, HTML5, CSS design tokens).
- Ensure all interactive features work across both Light and Dark themes.

### 4. Test Your Changes
Run the automated test runner to ensure all 40 level tasks pass cleanly:
```bash
node scratch/test-levels.js
```

### 5. Commit & Push
Write clear, descriptive commit messages:
```bash
git add .
git commit -m "feat: add new git stash interactive scenario"
git push -u origin feature/your-feature-name
```

### 6. Open a Pull Request
Go to `https://github.com/rahulthatipam/git-fast-learning` and click **Compare & pull request**. Describe your changes, link any related issues, and submit for review!

---

## 🛠️ Project Code Structure

- `index.html`: Main interactive skill roadmap & hero landing page
- `level-1-basics.html` – `level-4-advanced.html`: Level workspace pages
- `story.html`: One Shot ⚡ complete visual lifecycle story
- `ask-ai.html`: 100 "What to Ask AI" questions companion
- `reference.html`: Searchable Git command reference cheat sheet
- `js/git-engine.js`: In-browser Git engine & repository simulator
- `js/lab.js`: UI workspace layout, graph canvas, terminal, and task runner
- `js/levels.js`: Level task definitions, verification rules, and hints
- `js/progress.js`: LocalStorage XP gamification and topbar navigation

---

## 📜 Code of Conduct

Please be respectful and encouraging in all discussions, pull request reviews, and issue comments. Happy coding!
