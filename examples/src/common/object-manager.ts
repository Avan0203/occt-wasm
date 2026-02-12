import { ObjectID } from "./id-tool";
import { BrepObjectAll } from "./object";

const USE_ID_MAP = new Map<string, ObjectID>();
const ID_OBJECT_MAP = new Map<string, BrepObjectAll>();

class ObjectManager {

    addObject(key: string, object: BrepObjectAll): void {
        ID_OBJECT_MAP.set(key, object);
    }

    getObject(key: string): BrepObjectAll | undefined {
        return ID_OBJECT_MAP.get(key);
    }

    hasObject(key: string): boolean {
        return ID_OBJECT_MAP.has(key);
    }

    deleteObject(key: string): void {
        ID_OBJECT_MAP.delete(key);
    }

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

    clear(): void {
        USE_ID_MAP.clear();
        ID_OBJECT_MAP.clear();
    }
}

const OBJECT_MANAGER = new ObjectManager();

export { OBJECT_MANAGER };