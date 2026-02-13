import type { ClassHandle } from "public/occt-wasm";

/** c 函数：传入什么就返回什么，用于收集临时/持久资源 */
type CollectFn = <T extends ClassHandle>(obj: T) => T;

function gc<R>(action: (c: CollectFn, p: CollectFn) => R): { result: R; release: () => void } {

    const temporary = new Set<ClassHandle>();
    const persistent = new Set<ClassHandle>();

    const collectTemporary: CollectFn = (obj) => {
        if (temporary.has(obj)) {
            throw new Error("[gc] 同一对象不能重复收集到 temporary");
        }
        if (persistent.has(obj)) {
            throw new Error("[gc] 对象已收集为 persistent，不能同时收集到 temporary");
        }
        temporary.add(obj);
        return obj;
    };

    const collectPersistent: CollectFn = (obj) => {
        if (persistent.has(obj)) {
            throw new Error("[gc] 同一对象不能重复收集到 persistent");
        }
        if (temporary.has(obj)) {
            throw new Error("[gc] 对象已收集为 temporary，不能同时收集到 persistent");
        }
        persistent.add(obj);
        return obj;
    };

    const releaseTemporary = () => {
        temporary.forEach(obj => {
            if (!obj.isDeleted()) {
                obj.delete();
            }
        });
        temporary.clear();
    }

    const releasePersistent = () => {
        persistent.forEach(obj => {
            if (!obj.isDeleted()) {
                obj.delete();
            }
        });
        persistent.clear();
    }

    try {
        return {
            result: action(collectTemporary, collectPersistent),
            release: releasePersistent
        }
    } catch (error) {
        releaseTemporary();
        releasePersistent();
        console.error("[gc] 发生错误，已释放所有资源", error);
        throw error;
    } finally {
        releaseTemporary();
    }
}

export { gc };