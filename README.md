<p align="center">
  <img src="assets/icon.png" alt="DevHop logo" width="128" height="128">
</p>

# DevHop — Project & Branch Switcher

Switch projects and branches from the VS Code status bar.

- **Project** — find Git projects, including nested repositories, with recently visited projects first.
- **Branch** — switch branches or open an associated worktree in the current or a new window.

Click either button, type to search, and press `Enter` to select.

[Source code](https://github.com/joisun/devhop) · [Report an issue](https://github.com/joisun/devhop/issues)

## Shortcuts

| Action | macOS | Windows / Linux |
| --- | --- | --- |
| Switch Project | `Option+P` | `Alt+P` |
| Switch Branch | `Option+B` | `Alt+B` |

Customize these in **Keyboard Shortcuts** by searching for `DevHop`. **Add Project** and **Refresh Projects** are available in the Command Palette.

## Configuration

Set the directories to scan in VS Code settings:

```jsonc
{
  "projectSwitcher.projects.scanRoots": [
    "$WORKSPACE"
  ],
  "projectSwitcher.projects.excludes": [
    "**/archived/**"
  ],
  "projectSwitcher.projects.maxDepth": 4
}
```

- `scanRoots`: absolute directories, optionally using environment variables. `$WORKSPACE` must be an environment variable available to VS Code, not the currently opened folder. Relative paths, `~`, and filesystem roots are not supported.
- `excludes`: directory patterns to skip.
- `maxDepth`: maximum scan depth; the scan root is depth `0`.
