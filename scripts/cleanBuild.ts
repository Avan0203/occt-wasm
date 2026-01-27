import path from "node:path";
import fs from "node:fs";

const buildDir = path.join(process.cwd(), "build");
const cmakeCacheFile = path.join(buildDir, "CMakeCache.txt");

/**
 * 检查CMakeCache.txt中的生成器类型
 * @returns 如果生成器是Ninja返回true，否则返回false，如果文件不存在返回null
 */
function checkGenerator(): boolean | null {
    if (!fs.existsSync(cmakeCacheFile)) {
        return null;
    }

    try {
        const content = fs.readFileSync(cmakeCacheFile, "utf-8");
        // 查找 CMAKE_GENERATOR:INTERNAL= 这一行
        const match = content.match(/^CMAKE_GENERATOR:INTERNAL=(.+)$/m);
        if (match) {
            const generator = match[1].trim();
            return generator === "Ninja";
        }
    } catch (error) {
        console.warn("Failed to read CMakeCache.txt:", error);
    }

    return null;
}

function cleanBuild(): void {
    if (!fs.existsSync(buildDir)) {
        console.log("Build directory does not exist, nothing to clean.");
        return;
    }

    const isNinja = checkGenerator();

    // 如果生成器已经是Ninja，不需要清理，保持增量编译
    if (isNinja === true) {
        console.log("Generator is already Ninja, keeping build cache for incremental compilation.");
        return;
    }

    // 如果生成器不是Ninja或文件不存在，只删除CMakeCache.txt
    // 不删除CMakeFiles目录，因为那里可能包含有用的构建状态
    // CMake会在重新配置时自动处理生成器切换
    if (fs.existsSync(cmakeCacheFile)) {
        fs.unlinkSync(cmakeCacheFile);
        console.log("Removed CMakeCache.txt (generator mismatch or first build)");
        console.log("CMakeFiles directory preserved for potential incremental builds.");
    } else {
        console.log("No CMakeCache.txt found, ready for first build.");
    }
}

cleanBuild();
