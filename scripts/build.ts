import { execSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const emsdkDir = path.join(root, "source", "emsdk");
const buildCore =
  "pnpm clean:build && cd build && emcmake cmake .. -G Ninja && cmake --build .";

const isWin = process.platform === "win32";
const fullCmd = isWin
  ? `call "${path.join(emsdkDir, "emsdk_env.bat")}" && ${buildCore}`
  : `source "${path.join(emsdkDir, "emsdk_env.sh")}" && ${buildCore}`;

execSync(fullCmd, {
  stdio: "inherit",
  shell: isWin ? "cmd.exe" : "bash",
  cwd: root,
});
