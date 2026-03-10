import * as THREE from 'three';
import { Case, CaseContext } from '@/router';
import { createBrepMesh } from '@/common/shape-converter';
import { GeomAbs_Shape, TopoDS_Shape } from 'public/occt-wasm';
import { BrepMesh } from '@/common/object';
import { App } from '@/common/app';
import { Modeler, Shape, Vector3, Vertex, SketchBuilder, getOCCTModule } from '@/sdk';

let app: App;

export const loftCase: Case = {
    id: 'loft',
    name: 'Loft',
    description: 'Loft from vertex through square wire to circular wire',
    load,
    unload
}

let object: BrepMesh | null = null;
let profileShapes: TopoDS_Shape[] = [];

async function load(context: CaseContext): Promise<void> {
    const { container, gui } = context;
    try {
        container.innerHTML = '';
        app = new App(container)!;

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/matcaps_64px.png');
        const material = new THREE.MeshMatcapMaterial({
            matcap: texture,
            color: '#ccbbff',
            side: 2,
            transparent: true,
            opacity: 0.5
        });

        const builder = SketchBuilder.getInstance();

        // 1. 顶点：位置 (-2, 0, 0)
        const vertex = Vertex.makeVertex(new Vector3(-2, 0, 0));
        profileShapes.push(vertex);

        // 2. 正方形 wire：normal 为 X 方向，尺寸 3，中心在原点
        // 在 YZ 平面 (x=0)，正方形从 -1.5 到 1.5，四角：(0,-1.5,-1.5) (0,1.5,-1.5) (0,1.5,1.5) (0,-1.5,1.5)
        builder.beginPath(new Vector3(1, 0, 0));
        builder.moveTo(new Vector3(0, -1.5, -1.5));
        builder.lineTo(new Vector3(0, 1.5, -1.5));
        builder.lineTo(new Vector3(0, 1.5, 1.5));
        builder.lineTo(new Vector3(0, -1.5, 1.5));
        builder.closePath();
        const squareWire = builder.build().toWire();
        profileShapes.push(squareWire);

        // 3. 圆形 wire：normal 为 X 方向，圆心在 (3, 0, 0)，半径 1.5 与正方形半尺寸一致
        builder.beginPath(new Vector3(1, 0, 0));
        builder.circle(new Vector3(3, 0, 0), new Vector3(3, 1.5, 0));
        const circleWire = builder.build().toWire();
        profileShapes.push(circleWire);

        // 显示轮廓（顶点、正方形、圆）供参考
        const vertexMesh = createBrepMesh(vertex, Shape.toBRepResult(vertex, 0.1, 0.5), material);
        app.add(vertexMesh);
        const squareMesh = createBrepMesh(squareWire, Shape.toBRepResult(squareWire, 0.1, 0.5), material);
        app.add(squareMesh);
        const circleMesh = createBrepMesh(circleWire, Shape.toBRepResult(circleWire, 0.1, 0.5), material);
        app.add(circleMesh);

        const params: {
            isRuled: boolean;
            continuity: number;
            isSolid: boolean;
            build: () => void;
        } = {
            isRuled: false,
            continuity: 2, // GeomAbs_C1
            isSolid: false,
            build: () => {
                material.transparent = !params.isSolid;
                material.side = params.isSolid ? 0 : 2;
                if (object) {
                    app.remove(object);
                    object.dispose();
                    object = null;
                }
                const { GeomAbs_Shape: GAS } = getOCCTModule();
                const continuityMap: GeomAbs_Shape[] = [
                    GAS.GeomAbs_C0,
                    GAS.GeomAbs_G1,
                    GAS.GeomAbs_C1,
                    GAS.GeomAbs_G2,
                    GAS.GeomAbs_C2,
                    GAS.GeomAbs_C3,
                    GAS.GeomAbs_CN,
                ];
                const continuity = continuityMap[params.continuity] ?? GAS.GeomAbs_C1;
                const topoResult = Modeler.loft(profileShapes, params.isRuled, continuity, params.isSolid);
                if (!topoResult.status) {
                    return alert(topoResult.message);
                }
                const result = Shape.toBRepResult(topoResult.shape, 0.1, 0.5);
                object = createBrepMesh(topoResult.shape, result, material);
                topoResult.deleteLater();
                app.add(object);
            }
        };

        params.build();
        gui.add(params, 'isSolid').name('Make Solid');
        gui.add(params, 'isRuled').name('Ruled Mode (Disable Continuity)');
        gui.add(params, 'continuity', { C0: 0, G1: 1, C1: 2, G2: 3, C2: 4, C3: 5, CN: 6 }).name('Continuity');
        gui.add(params, 'build');

        app.fitToView();

    } catch (error) {
        console.error('Error loading loft case:', error);
    }
}

function unload(): void {
    if (app) {
        app.dispose();
        app = undefined!;
    }
    profileShapes = [];
}
