import { ObjectID } from "./id-tool";
import { BrepObjectAll } from "./object";
import { BrepGPUGroup } from "./object";

const USE_ID_MAP = new Map<string, ObjectID>();
const ID_OBJECT_MAP = new Map<string, BrepObjectAll>();
const OBJECT_GPU_MAP = new Map<string, BrepGPUGroup>();

class ObjectManager {
    /// 维护 Object 和 id 的映射关系
    /**
     * @description: 添加Object和id的映射关系
     * @param {string} key
     * @param {BrepObjectAll} object
     * @return {void}
     */
    addObject(key: string, object: BrepObjectAll): void {
        ID_OBJECT_MAP.set(key, object);
    }

    /**
     * @description: 获取Object
     * @param {string} key
     * @return {BrepObjectAll | undefined}
     */
    getObject(key: string): BrepObjectAll | undefined {
        return ID_OBJECT_MAP.get(key);
    }

    /**
     * @description: 判断Object是否存在
     * @param {string} key
     * @return {boolean}
     */
    hasObject(key: string): boolean {
        return ID_OBJECT_MAP.has(key);
    }

    /**
     * @description: 删除Object
     * @param {string} key
     * @return {void}
     */
    deleteObject(key: string): void {
        ID_OBJECT_MAP.delete(key);
    }

    ///

    addUseId(key: string, id: ObjectID): void {
        USE_ID_MAP.set(key, id);
    }

    getUseId(key: string): ObjectID | undefined {
        return USE_ID_MAP.get(key);
    }

    hasUseId(key: string): boolean {
        return USE_ID_MAP.has(key);
    }

    deleteUseId(key: string): void {
        USE_ID_MAP.delete(key);
    }

    /// 维护 GPUGroup 和 Object 的映射关系

    /**
     * @description: 首次绑定object和GPUGroup
     * @param {string} id
     * @param {BrepGPUGroup} group
     * @return {void}
     */
    setGPUGroup(id: string, group: BrepGPUGroup): void {
        OBJECT_GPU_MAP.set(id, group);
    }

    /**
     * @description: 判断GPUGroup是否存在
     * @param {string} id
     * @return {boolean}
     */
    hasGPUGroup(id: string): boolean {
        return OBJECT_GPU_MAP.has(id);
    }

    /**
     * @description: 删除GPUGroup
     * @param {string} id
     * @return {void}
     */
    deleteGPUGroup(id: string): void {
        OBJECT_GPU_MAP.delete(id);
    }

    /**
     * @description: 获取GPUGroup
     * @param {string} id
     * @return {BrepGPUGroup}
     */
    getGPUGroup(id: string): BrepGPUGroup | undefined {
        return OBJECT_GPU_MAP.get(id)!;
    }

    clear(): void {
        USE_ID_MAP.clear();
        ID_OBJECT_MAP.clear();
        OBJECT_GPU_MAP.clear();
    }
}

const OBJECT_MANAGER = new ObjectManager();

export { OBJECT_MANAGER };