<p align="center">
  <img src="assets/icon.png" alt="DevHop logo" width="128" height="128">
</p>

# DevHop — Project & Branch Switcher

DevHop adds two native-looking status bar controls to VS Code:

```text
Project | Branch
```

The Project picker discovers nested Git repositories under configured scan roots and sorts them by recent visits. The Branch picker understands Git worktrees: choosing a branch already checked out elsewhere offers to open its worktree in the current or a new window.

[Source code](https://github.com/joisun/devhop) · [Report an issue](https://github.com/joisun/devhop/issues)

## Configuration

The extension ID is `sunzhongyi.devhop`. Configuration keys and command IDs retain the `projectSwitcher` prefix for compatibility with the development version. Disable or uninstall the previous local Project Switcher extension before installing DevHop to avoid duplicate status bar controls and shortcut conflicts.

```jsonc
{
  "projectSwitcher.projects.scanRoots": [
    "$WORKSPACE/backend",
    "${env:PROJECTS_HOME}/frontend"
  ],
  "projectSwitcher.projects.excludes": [
    "**/node_modules/**",
    "**/dist/**"
  ],
  "projectSwitcher.projects.maxDepth": 4,
  "projectSwitcher.projects.scanOnStartup": true
}
```

`scanRoots` accepts absolute paths and environment-variable expressions using `$NAME`, `${NAME}`, `${env:NAME}`, or `%NAME%`. After expansion, every value must be an accessible absolute directory. Relative paths, `~`, missing variables, and filesystem roots such as `/` or `C:\` are rejected.

The scan root itself has depth `0`. Git repositories are recognized by either a `.git` directory or a `.git` file, and discovery continues below a repository so nested repositories are included. Linked worktrees that share the same Git common directory are presented as one project.

## Commands

- `DevHop: Switch Project`
- `DevHop: Switch Branch`
- `DevHop: Refresh Projects`
- `DevHop: Add Project...`

Default shortcuts are `Option+P` for Switch Project and `Option+B` for Switch Branch on macOS (`Alt+P` / `Alt+B` on Windows and Linux). To customize or remove these bindings, open VS Code's **Keyboard Shortcuts**, search for `DevHop: Switch Project` or `DevHop: Switch Branch`, and edit the shortcut. Existing user-defined shortcuts take precedence over extension defaults.

Both switchers use VS Code's native Quick Pick above the editor, without opening or closing the terminal panel. They support text filtering, arrow keys, `Enter`, `Tab`, `Shift+Tab`, and `Escape`. Tab navigation applies only while a DevHop picker is open.

Search is case-insensitive and selects the best name match first: exact name, name prefix, name substring, then fuzzy name matches. Path and other metadata matches follow. Each field is matched separately; characters cannot be combined across names and paths. An empty search preserves the original order (recent visits first for projects). While searching, native Quick Pick may additionally sort matching labels; the extension's highest-ranked result is initially active.

## Development

```sh
pnpm install
pnpm run check
pnpm run test
pnpm run build
```

Open the project in VS Code and run the **Run DevHop** launch configuration to test it in an Extension Development Host.

The Marketplace logo and README use `assets/icon.png`, the approved C concept: a teal starting point connected to a slate endpoint by a curved path on white. It was generated with the built-in image generation tool from the approved concept preview. The design brief is: preserve the C geometry, center one symbol on a square white canvas, retain teal and slate colors, and omit text, borders, shadows, and glow. This PNG is the current logo asset; the retired folder-tree SVG is available only in Git history. The Myna status bar icon font is separate and should not change when updating the brand logo.

To package a release, run `pnpm dlx @vscode/vsce package --no-dependencies`. The prepublish script runs type checks, tests, and the build. Inspect the resulting VSIX before uploading it to Marketplace. Browser automation logs, source maps, and previously built VSIX files must remain excluded from the package. A Marketplace upload publishes the extension package; it does not upload the source code to GitHub.
