import path from "node:path";
import fs from "fs";
import { execAsync } from "./exeAsync";

type LibItem = {
    namespace: string;
    url: string;
    tag: string;
    patches: Function[];
    cmd: Function[];
}

const fixSSLCheck = async (url: string) => {
    const code = `from urllib.request import urlopen\n`;
    const addCode = `
import ssl\n
ssl._create_default_https_context = ssl._create_unverified_context\n
    `;
    const file = path.resolve(`${url}/emsdk.py`);
    let contents = fs.readFileSync(file, "utf8");
    if(!contents.includes(addCode)){
        contents = contents.replace(code, code + addCode);
    }
    fs.writeFileSync(file, contents, "utf8");
    console.log('fixSSLCheck done');
}

/** macOS 上改用 urllib 下载，避免 curl 连接被重置（如 35）；fixSSLCheck 已处理 urllib 的 SSL */
const useUrllibOnMac = async (url: string) => {
    const file = path.resolve(`${url}/emsdk.py`);
    let contents = fs.readFileSync(file, "utf8");
    const useCurlBlock = `    # Use curl on macOS to avoid CERTIFICATE_VERIFY_FAILED issue with
    # python's urllib:
    # https://stackoverflow.com/questions/40684543/how-to-make-python-use-ca-certificates-from-mac-os-truststore
    # Unlike on linux or windows, curl is always available on macOS systems.
    if MACOS:
      download_with_curl(url, file_name)
    else:
      download_with_urllib(url, file_name)`;
    const useUrllibOnly = `    # Prefer urllib on all platforms (fixSSLCheck handles SSL on macOS).
    download_with_urllib(url, file_name)`;
    if (contents.includes(useCurlBlock)) {
        contents = contents.replace(useCurlBlock, useUrllibOnly);
        fs.writeFileSync(file, contents, "utf8");
        console.log('useUrllibOnMac done');
    }
}

/** 下载失败时重试（应对 Connection reset by peer 等瞬时网络问题） */
const addDownloadRetry = async (url: string) => {
    const file = path.resolve(`${url}/emsdk.py`);
    let contents = fs.readFileSync(file, "utf8");
    const noRetry = `  try:
    # Prefer urllib on all platforms (fixSSLCheck handles SSL on macOS).
    download_with_urllib(url, file_name)
  except Exception as e:
    errlog(f"Error: Downloading URL '{url}': {e}")
    return None`;
    const withRetry = `  try:
    # Prefer urllib on all platforms (fixSSLCheck handles SSL on macOS).
    import time
    for _attempt in range(5):
      try:
        download_with_urllib(url, file_name)
        break
      except Exception as _e:
        if _attempt < 4:
          print(f"Download failed, retry {_attempt+1}/5 in {2*(_attempt+1)}s: {_e}")
          time.sleep(2 * (_attempt + 1))
        else:
          raise
  except Exception as e:
    errlog(f"Error: Downloading URL '{url}': {e}")
    return None`;
    if (contents.includes(noRetry) && !contents.includes("for _attempt in range(5)")) {
        contents = contents.replace(noRetry, withRetry);
        fs.writeFileSync(file, contents, "utf8");
        console.log('addDownloadRetry done');
    }
}


const activateEmscripten = async (url: string) => {
    console.log('url: ', url);
    const isWindows = process.platform === 'win32';
    const emsdkCmd = isWindows ? 'emsdk.bat' : './emsdk';
    // Note: source/call commands don't persist env vars across exec calls,
    // but we include it for completeness. Environment setup should be done manually if needed.
    const emsdkEnvCmd = isWindows ? 'call emsdk_env.bat' : 'source ./emsdk_env.sh';
    
    await execAsync(`${emsdkCmd} install latest`, { cwd: url });
    await execAsync(`${emsdkCmd} activate --embedded latest`, { cwd: url });
    await execAsync(emsdkEnvCmd, { cwd: url });
}

const libs: LibItem[] = [
    {
        namespace: "occt",
        url: "https://github.com/Open-Cascade-SAS/OCCT.git",
        tag: "V7_9_3",
        patches: [],
        cmd: []
    },
    {
        namespace: "emsdk",
        url: "https://github.com/emscripten-core/emsdk.git",
        tag: "4.0.22",
        patches: [fixSSLCheck, useUrllibOnMac, addDownloadRetry],
        cmd: [activateEmscripten]
    }
]

async function cloneLib({ namespace, url, tag, patches, cmd }: (typeof libs)[number]): Promise<void> {
    // 检查source下是否存在lib.namespace目录
    const libDir = path.join(process.cwd(), "source", namespace);
    if (!fs.existsSync(libDir)) {
        fs.mkdirSync(libDir, { recursive: true });
    }

    // 检查libDir下是否为空，如果为空则clone
    const isEmpty = fs.readdirSync(libDir).length === 0;
    if (isEmpty) {
        await execAsync(`git clone --depth 1 -b ${tag} ${url} ${libDir}`);
    }

    // 执行 patch
    if (patches.length > 0) {
        for (const patch of patches) {
            await patch(libDir);
        }
    }

    // 执行 cmd
    if (cmd.length > 0) {
        for (const command of cmd) {
            await command(libDir);
        }
    }
}

async function setupLibs(): Promise<void> {
    for (const lib of libs) {
        await cloneLib(lib);
    }
}

function main(): void {

    // 检查source目录是否存在
    const sourceDir = path.join(process.cwd(), "source");
    if (!fs.existsSync(sourceDir)) {
        fs.mkdirSync(sourceDir, { recursive: true });
    }

    // 检查build目录是否存在
    const buildDir = path.join(process.cwd(), "build");
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }

    setupLibs().then(() => {
    }).catch((error) => {
        console.error(error);
        process.exit(1);
    });
}

main();