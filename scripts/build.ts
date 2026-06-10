import { execSync } from "node:child_process";
import path from "node:path";

type BuildMode = "MONOLITH" | "SPLIT";
type BuildScope = "ALL" | "CORE" | "EXCHANGE";
type CcacheMode = "AUTO" | "ON" | "OFF";

const root = process.cwd();
const emsdkDir = path.join(root, "source", "emsdk");
const isWin = process.platform === "win32";

function hasCcacheOnPath(): boolean {
  try {
    execSync("ccache --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let mode: BuildMode = "SPLIT";
  let scope: BuildScope | undefined;
  let target: string | undefined;
  let clean = false;
  let ccache: CcacheMode = "AUTO";

  for (const arg of args) {
    if (arg === "--clean") {
      clean = true;
    } else if (arg === "--ccache") {
      ccache = "ON";
    } else if (arg === "--no-ccache") {
      ccache = "OFF";
    } else if (arg.startsWith("--mode=")) {
      mode = arg.slice("--mode=".length).toUpperCase() as BuildMode;
    } else if (arg.startsWith("--scope=")) {
      scope = arg.slice("--scope=".length).toUpperCase() as BuildScope;
    } else if (arg.startsWith("--target=")) {
      target = arg.slice("--target=".length);
    }
  }

  if (mode !== "MONOLITH" && mode !== "SPLIT") {
    throw new Error(`Invalid mode: ${mode}. Use MONOLITH or SPLIT.`);
  }
  if (scope && !["ALL", "CORE", "EXCHANGE"].includes(scope)) {
    throw new Error(`Invalid scope: ${scope}. Use ALL, CORE, or EXCHANGE.`);
  }

  return { mode, scope, target, clean, ccache };
}

function runShell(command: string) {
  execSync(command, {
    stdio: "inherit",
    shell: isWin ? "cmd.exe" : "bash",
    cwd: root,
  });
}

const { mode, scope, target, clean, ccache } = parseArgs();

if (ccache === "ON" && !hasCcacheOnPath()) {
  throw new Error("ccache not found in PATH. Install ccache or omit --ccache.");
}
if (ccache !== "OFF" && hasCcacheOnPath()) {
  console.log("[build] ccache detected, compiler launcher enabled (AUTO/ON)");
}

const cmakeFlags = [
  `-DOCCT_WASM_BUILD_MODE=${mode}`,
  `-DOCCT_WASM_USE_CCACHE=${ccache}`,
];
if (mode === "SPLIT" && scope) {
  cmakeFlags.push(`-DOCCT_WASM_BUILD_SCOPE=${scope}`);
}

const steps: string[] = [];
if (clean) {
  steps.push("pnpm clean:build");
}

steps.push(`emcmake cmake -S . -B build -G Ninja ${cmakeFlags.join(" ")}`);

if (target) {
  steps.push(`cmake --build build --target ${target}`);
} else {
  steps.push("cmake --build build");
}

const fullCmd = isWin
  ? `call "${path.join(emsdkDir, "emsdk_env.bat")}" && ${steps.join(" && ")}`
  : `source "${path.join(emsdkDir, "emsdk_env.sh")}" && ${steps.join(" && ")}`;

runShell(fullCmd);
