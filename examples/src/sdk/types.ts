

import type { MainModule, TopAbs_ShapeEnum } from 'public/occt-wasm';
import { getOCCTModule } from './occt-loader';

export enum EN_Direction {
    CLOCKWISE = 1,
    COUNTER_CLOCKWISE = -1,
}

export enum ShapeType {
    COMPOUND = 'Compound',
    COMPSOLID = 'Compsolid',
    SOLID = 'Solid',
    SHELL = 'Shell',
    FACE = 'Face',
    WIRE = 'Wire',
    EDGE = 'Edge',
    VERTEX = 'Vertex',
}

type ShapeTypeEnumMap = Record<ShapeType, TopAbs_ShapeEnum>;

let cachedShapeTypeMap: ShapeTypeEnumMap | null = null;

function createShapeTypeMap(module: MainModule): ShapeTypeEnumMap {
    const { TopAbs_ShapeEnum } = module;
    return {
        [ShapeType.COMPOUND]: TopAbs_ShapeEnum.TopAbs_COMPOUND,
        [ShapeType.COMPSOLID]: TopAbs_ShapeEnum.TopAbs_COMPSOLID,
        [ShapeType.SOLID]: TopAbs_ShapeEnum.TopAbs_SOLID,
        [ShapeType.SHELL]: TopAbs_ShapeEnum.TopAbs_SHELL,
        [ShapeType.FACE]: TopAbs_ShapeEnum.TopAbs_FACE,
        [ShapeType.WIRE]: TopAbs_ShapeEnum.TopAbs_WIRE,
        [ShapeType.EDGE]: TopAbs_ShapeEnum.TopAbs_EDGE,
        [ShapeType.VERTEX]: TopAbs_ShapeEnum.TopAbs_VERTEX,
    };
}

export function getShapeTypeEnum(type: ShapeType): TopAbs_ShapeEnum {
    if (!cachedShapeTypeMap) {
        const module = getOCCTModule();
        cachedShapeTypeMap = createShapeTypeMap(module);
    }
    return cachedShapeTypeMap[type];
}