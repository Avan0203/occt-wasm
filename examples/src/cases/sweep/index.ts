import * as THREE from 'three';
import { Case, CaseContext } from '@/router';
import { createBrepMesh } from '@/common/shape-converter';
import { BrepMesh } from '@/common/object';
import { App } from '@/common/app';
import { EN_Direction, Vector3, gc } from '@/sdk';
import { SketchBuilder } from '@/sdk/sketch';
import { Modeler, Shape } from '@/sdk';

let app: App;

export const sweepCase: Case = {
    id: 'sweep',
    name: 'Sweep',
    description: 'Sweep a shape along a path',
    load,
    unload
}

let object: BrepMesh | null = null;

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

        // U 形 path：在 XZ 平面 (y=0)，法向需为 (0,1,0)
        builder.beginPath(new Vector3(0, 1, 0));
        builder.moveTo(new Vector3(3, 0, 2));
        builder.lineTo(new Vector3(0, 0, 2));
        builder.arc(new Vector3(0, 0, 0), new Vector3(0, 0, 2), new Vector3(0, 0, -2), EN_Direction.CLOCKWISE);
        builder.lineTo(new Vector3(3, 0, -2));
        builder.lineTo(new Vector3(3, 0, -6));
        builder.bSplineFromControlPoints([new Vector3(1, 0, -8), new Vector3(5, 0, -10), new Vector3(1, 0, -12), new Vector3(3, 0, -14)]);
        const pathSketch = builder.build();
        const pathWire = pathSketch.toWire();

        const pathMesh = createBrepMesh(pathWire, Shape.toBRepResult(pathWire, 0.1, 0.5), material);
        app.add(pathMesh);


        // 圆形 profile：在 path 起点 (3,0,2) 处的垂直平面（YZ 平面），圆心在 path 起点
        builder.beginPath(new Vector3(1, 0, 0));
        builder.moveTo(new Vector3(3, 0, 2));
        builder.circle(new Vector3(3, 0, 2), new Vector3(3, 1, 2));
        const profileSketch = builder.build();
        const profileWire = profileSketch.toWire();
        const profileMesh = createBrepMesh(profileWire, Shape.toBRepResult(profileWire, 0.1, 0.5), material);
        app.add(profileMesh);


        const params: {
            isFrenet: boolean;
            isRound: boolean;
            isSolid: boolean;
            build: () => void;
        } = {
            isFrenet: false,
            isRound: true,
            isSolid: false,
            build: () => {
                material.transparent = !params.isSolid;
                material.side = params.isSolid ? 0 : 2;
                if (object) {
                    app.remove(object);
                    object.dispose();
                    object = null;
                }
                const topoResult = Modeler.sweep([profileWire], pathWire, params.isRound, params.isSolid, params.isFrenet);
                if (!topoResult.status) {
                    return alert(topoResult.message);
                }
                const result = Shape.toBRepResult(topoResult.shape, 0.1, 0.5);
                object = createBrepMesh(topoResult.shape, result, material);
                topoResult.deleteLater();
                app.add(object);
            }
        }

        params.build();
        gui.add(params, 'isSolid').name('MakeSolid')
        gui.add(params, 'isFrenet').name('Frenet Mode');
        gui.add(params, 'isRound').name('Round Corner');
        gui.add(params, 'build');

        app.fitToView();

    } catch (error) {
        console.error('Error loading sweep case:', error);
    }
}

function unload(): void {
    if (app) {
        app.dispose();
        app = undefined!;
    }
}
