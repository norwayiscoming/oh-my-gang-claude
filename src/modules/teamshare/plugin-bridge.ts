import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { ExtensionModule } from "../../types";
import { log } from "../../utils";

// ─── Claude Code Plugin Bridge ─────────────────────────────────────
// On VS Code extension activate:
// 1. Copies claude-plugin/ to ~/.claude/custom-plugins/teamshare/
// 2. Adds shell function to ~/.zshrc / ~/.bashrc so `claude` auto-loads plugin
// 3. Sets up .teamshare/ in the workspace
//
// Result: user installs VS Code extension → opens terminal → `claude` just works
// with /teamshare:* commands available.

const PLUGIN_NAME = "teamshare";
const PLUGIN_DIR_NAME = "custom-plugins";
const SHELL_MARKER = "# >>> oh-my-claude-gang >>>";
const SHELL_MARKER_END = "# <<< oh-my-claude-gang <<<";

export const pluginBridgeModule: ExtensionModule = {
  id: "pluginBridge",

  async activate(context) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }

    const projectRoot = workspaceFolders[0].uri.fsPath;
    const extensionPath = context.extensionPath;
    const pluginSourceDir = path.join(extensionPath, "claude-plugin");
    const pluginDestDir = path.join(getClaudeConfigDir(), PLUGIN_DIR_NAME, PLUGIN_NAME);

    // 1. Copy plugin files
    try {
      copyDirRecursive(pluginSourceDir, pluginDestDir);
      makeHooksExecutable(path.join(pluginDestDir, "hooks"));
      log(`Plugin installed to ${pluginDestDir}`);
    } catch (err) {
      log(`Failed to install plugin: ${err}`, "error");
    }

    // 2. Add shell wrapper so `claude` auto-loads the plugin
    const shellConfigured = addShellWrapper(pluginDestDir);
    if (shellConfigured) {
      log("Shell wrapper added - `claude` will auto-load teamshare plugin");
    }

    // 3. Ensure .teamshare/ in workspace
    ensureTeamShareDir(projectRoot);

    // 4. Configure VS Code terminal to include --plugin-dir
    configureVSCodeTerminal(pluginDestDir);

    // 5. Status bar
    const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
    statusItem.text = "$(people) TeamShare";
    statusItem.tooltip = "Oh My Claude Gang - TeamShare active\nClick to search sessions";
    statusItem.command = "shareMyClaudeMax.search";
    statusItem.show();

    context.subscriptions.push(statusItem);

    // 6. Show welcome message on first install
    const isFirstInstall = !context.globalState.get("teamshare.installed");
    if (isFirstInstall) {
      context.globalState.update("teamshare.installed", true);
      const action = await vscode.window.showInformationMessage(
        "Oh My Claude Gang installed! Open a new terminal and run `claude` — /teamshare commands are ready.",
        "Open Terminal"
      );
      if (action === "Open Terminal") {
        vscode.commands.executeCommand("workbench.action.terminal.new");
      }
    }

    log("Plugin bridge activated");
  },
};

function getClaudeConfigDir(): string {
  const home = os.homedir();
  return path.join(home, ".claude");
}

function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function makeHooksExecutable(hooksDir: string): void {
  if (!fs.existsSync(hooksDir)) {
    return;
  }
  for (const file of fs.readdirSync(hooksDir)) {
    if (file.endsWith(".sh") || file.endsWith(".py")) {
      fs.chmodSync(path.join(hooksDir, file), 0o755);
    }
  }
}

// ─── Shell Wrapper ─────────────────────────────────────────────────
// Adds a shell function that wraps `claude` to auto-include --plugin-dir.
// Supports zsh and bash. Idempotent (checks for marker before adding).

function addShellWrapper(pluginDir: string): boolean {
  const home = os.homedir();
  const shellConfigs = [
    path.join(home, ".zshrc"),
    path.join(home, ".bashrc"),
  ];

  const snippet = `
${SHELL_MARKER}
# Auto-load Oh My Claude Gang plugin with Claude Code
claude() {
  command claude --plugin-dir "${pluginDir}" "$@"
}
${SHELL_MARKER_END}
`;

  let configured = false;

  for (const configPath of shellConfigs) {
    if (!fs.existsSync(configPath)) {
      continue;
    }

    const content = fs.readFileSync(configPath, "utf-8");

    // Already configured
    if (content.includes(SHELL_MARKER)) {
      // Update path if changed
      if (!content.includes(pluginDir)) {
        const updated = content.replace(
          new RegExp(`${escapeRegex(SHELL_MARKER)}[\\s\\S]*?${escapeRegex(SHELL_MARKER_END)}`),
          snippet.trim()
        );
        fs.writeFileSync(configPath, updated);
        log(`Updated plugin path in ${configPath}`);
      }
      configured = true;
      continue;
    }

    // Add new
    fs.appendFileSync(configPath, snippet);
    configured = true;
    log(`Added shell wrapper to ${configPath}`);
  }

  return configured;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── VS Code Terminal Config ───────────────────────────────────────
// Configure VS Code integrated terminal to auto-load plugin.

function configureVSCodeTerminal(pluginDir: string): void {
  const config = vscode.workspace.getConfiguration("terminal.integrated");
  const currentEnv = config.get<Record<string, string>>("env.osx") ?? {};

  // Set env var that our shell wrapper can use
  if (!currentEnv["CLAUDE_TEAMSHARE_PLUGIN_DIR"]) {
    const updatedEnv = { ...currentEnv, CLAUDE_TEAMSHARE_PLUGIN_DIR: pluginDir };
    config.update("env.osx", updatedEnv, vscode.ConfigurationTarget.Global);
  }
}

function ensureTeamShareDir(projectRoot: string): void {
  const teamshareDir = path.join(projectRoot, ".teamshare");
  const dirs = [
    teamshareDir,
    path.join(teamshareDir, "sessions", "summaries"),
    path.join(teamshareDir, "sessions", "vectors"),
    path.join(teamshareDir, "search"),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const gitignorePath = path.join(projectRoot, ".gitignore");
  try {
    const content = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf-8") : "";
    if (!content.includes(".teamshare")) {
      fs.appendFileSync(gitignorePath, content.endsWith("\n") ? ".teamshare/\n" : "\n.teamshare/\n");
    }
  } catch {
    // Non-critical
  }
}
