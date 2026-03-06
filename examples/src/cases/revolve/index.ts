import * as THREE from 'three';
import { Case, CaseContext } from '@/router';
import { createBrepMesh } from '@/common/shape-converter';
import { BrepMesh } from '@/common/object';
import { App } from '@/common/app';
import { Axis1, Vector3, gc } from '@/sdk';
import { TopoDS_Wire } from 'public/occt-wasm';

let app: App;

export const revolveCase: Case = {
    id: 'revolve',
    name: 'Revolve',
    description: 'Revolve a shape around an axis',
    load,
    unload
}

let object: BrepMesh | null = null;
let wire: TopoDS_Wire | null = null;

async function load(context: CaseContext): Promise<void> {
    const { container, occtModule, gui } = context;
    try {

        const {
            Modeler,
            Shape,
            Wire
        } = occtModule

        container.innerHTML = '';
        app = new App(container)!;


        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/matcaps_64px.png');

        const axis = new Axis1(new Vector3(0, 0, 0), new Vector3(0, 1, 0));

        const axesHelper = new THREE.ArrowHelper(new THREE.Vector3().copy(axis.direction), new THREE.Vector3().copy(axis.origin), 120, 0x00ffff);
        app.addHelper(axesHelper);

        const material = new THREE.MeshMatcapMaterial({ matcap: texture, color: '#ccbbff', side: 2 });

        wire = gc((c) => {
            return Wire.close(c(Wire.fromVertices([
                new Vector3(1, 0, 0),
                new Vector3(2, 0, 0),
                new Vector3(2, 2, 0),
                new Vector3(1, 2, 0),
            ])))
        });

        const wireResult = Shape.toBRepResult(wire!, 0.1, 0.5);
        const wireMesh = createBrepMesh(wire!, wireResult, material);
        app.add(wireMesh);

        const params: {
            angle: number;
            build: () => void;
        } = {
            angle: 0.5,
            build: () => {
                if (object) {
                    app.remove(object);
                    object.dispose();
                    object = null;
                }
                const topoResult = Modeler.revolve(wire!, new Axis1(new Vector3(0, 0, 0), new Vector3(0, 1, 0)), params.angle);
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


        gui.add(params, 'angle', 0, 2 * Math.PI, 0.01);
        gui.add(params, 'build');


        app.fitToView();

    } catch (error) {
        console.error('Error loading box show case:', error);
    }
}

function unload(): void {
    if (app) {
        app.dispose();
        app = undefined!;
        wire = null;
    }
}