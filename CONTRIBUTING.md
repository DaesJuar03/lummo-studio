# Contributing to Lummo Studio

Thank you for your interest in contributing to **Lummo Studio**! We welcome contributions from developers of all skill levels.

## How to Contribute

### Reporting Bugs
Before opening a new issue, please check existing issues to see if the bug has already been reported. When reporting a bug, please include:
- A clear, descriptive title.
- Detailed steps to reproduce the issue.
- Your OS version and environment details.
- Relevant log output or screenshots.

### Suggesting Features
Enhancement suggestions are welcome! Please submit a feature request issue with:
- A clear description of the proposed feature.
- Rationale for why this feature would be useful to Lummo Studio users.
- Any mockups or design ideas.

### Pull Requests Workflow

1. **Fork & Clone** the repository.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Development**:
   Run the development environment:
   ```bash
   npm run dev            # For web preview
   npm run electron:dev   # For Electron application testing
   ```
5. **Testing**:
   Ensure all existing tests pass:
   ```bash
   npm test
   ```
6. **Commit Your Changes**:
   Write clear, concise commit messages.
7. **Push to Your Fork**:
   ```bash
   git push origin feature/my-new-feature
   ```
8. **Submit a Pull Request**:
   Open a PR against the `main` branch with a summary of changes made.

## Code Style & Standards

- Use clean, modern ES6+ React functional components with Hooks.
- Follow existing formatting and linting rules.
- Keep UI components reusable and clean.

Thank you for helping make Lummo Studio better! 🚀
