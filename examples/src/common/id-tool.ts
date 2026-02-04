const _usedIds = new Map<number, ObjectID>();
const _recycledIds: ObjectID[] = [];

class ObjectID {
    public static readonly INVALID: ObjectID = new ObjectID(-1);
    private static index = 1;
    private _id: number;
    public static generate(): ObjectID {
        if (_recycledIds.length > 0) {
            return _recycledIds.pop()!;
        } else {
            return new ObjectID(ObjectID.index++);
        }
    }

    /**
    * 检查ID是否有效
    * @param id 要检查的ID
    * @returns 如果ID有效则返回true，否则返回false
    */
    public static isValid(id: ObjectID): boolean {
        return id._id !== ObjectID.INVALID._id;
    }

    public static release(id:ObjectID): boolean {
        // 检查ID是否在使用中
        if (_usedIds.has(id._id)) {
            _usedIds.delete(id._id);
            // 将ID添加到回收池
            _recycledIds.push(id);
            return true;
        }
        // ID不在使用中，返回false表示释放失败
        return false;
    }

    private constructor(id: number) {
        this._id = id;
        _usedIds.set(this._id, this);
    }
    /**
     * 获取ID的数值表示
     * @returns ID的数值表示
     */
    public valueOf(): number {
        return this._id;
    }

    public toString(): string {
        return this._id.toString();
    }
}

export { ObjectID }