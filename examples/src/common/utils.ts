export function color2id(r: number, g: number, b: number): number {
    return (r << 16) | (g << 8) | b;
}

export function id2color(id: number): [number, number, number] {
    const r = (id >> 16) & 0xff;
    const g = (id >> 8) & 0xff;
    const b = id & 0xff;
    return [r, g, b];
}
/**
 * @description: 生成螺旋顺序
 * @param {number} w 宽度
 * @param {number} h 高度
 * @param {number[]} ret 结果
 * @return {number[]}
 */
export function createSpiralOrder(w: number, h: number, ret: number[] = []) {
    let u = 0;
    let d = h - 1;
    let l = 0;
    let r = w - 1;
    ret.length = 0;
    while (true) {
        // moving right
        for (let i = l; i <= r; ++i) {
            ret.push(u * w + i);
        }
        if (++u > d) {
            break;
        }
        // moving down
        for (let i = u; i <= d; ++i) {
            ret.push(i * w + r);
        }
        if (--r < l) {
            break;
        }
        // moving left
        for (let i = r; i >= l; --i) {
            ret.push(d * w + i);
        }
        if (--d < u) {
            break;
        }
        // moving up
        for (let i = d; i >= u; --i) {
            ret.push(i * w + l);
        }
        if (++l > r) {
            break;
        }
    }
    ret.reverse();
    return ret;
}

/**
* @description: 将LineLoop转换成LineSegment
* @param {number[]} position 位置数组
* @return {number[]}
* @example
* 例如将LineLoop四个点分为1,2,3,4，
* 转换后变成，1,2,2,3,3,4
*/
export function convertLineLoopToLineSegments(position: Float32Array): Float32Array {
    const result: number[] = [];
    // 每个点由 3 个分量组成 (x, y, z)
    const stride = 3;
    const count = position.length / stride;
    // 少于 2 个点，无法形成线段
    if (count < 2) return new Float32Array(0);

    for (let i = 0; i < count - 1; i++) {
        const a = i * stride;
        const b = (i + 1) * stride;

        // 当前点 -> 下一个点
        result.push(
            position[a], position[a + 1], position[a + 2],
            position[b], position[b + 1], position[b + 2]
        );
    }
    return new Float32Array(result);
}