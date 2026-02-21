import type { ClassHandle } from "public/occt-wasm";

/** c 函数：传入什么就返回什么，用于收集临时/持久资源 */
type CollectFn = <T extends ClassHandle>(obj: T) => T;

function gc<R>(action: (c: CollectFn) => R): R {

    const temporary = new Set<ClassHandle>();

    const collectTemporary: CollectFn = (obj) => {
        if (temporary.has(obj)) {
            throw new Error("[gc] 同一对象不能重复收集到 temporary");
        }
        temporary.add(obj);
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

    try {
        return action(collectTemporary);
    } catch (error) {
        releaseTemporary();
        console.error("[gc] 发生错误，已释放所有资源", error);
        throw error;
    } finally {
        releaseTemporary();
    }
}

export { gc };