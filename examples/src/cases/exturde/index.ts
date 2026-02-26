import { Case, CaseContext } from '@/router';
import * as THREE from 'three';
import { createBrepGroup } from '@/common/shape-converter';
import { TopoDS_Shape } from 'public/occt-wasm';
import { BrepGroup } from '@/common/object';
import { App } from '@/common/app';

export const exturdeCase: Case = {
    id: 'exturde',
    name: 'Exturde',
    description: 'Exturde a face',
    load,
    unload
}

const globalGC: TopoDS_Shape[] = [];

let app: App;

async function load(context: CaseContext): Promise<void> {
    const { container, occtModule, gui } = context;
    try {

        const {
            Modeler,
            Face,
            Shape,
        } = occtModule

        container.innerHTML = '';

        app = new App(container);

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/matcaps_64px.png');

        const rectFace = Face.fromVertices(
            [{ x: -2, y: -2, z: 2 }, { x: -2, y: -2, z: -2 }, { x: 2, y: -2, z: -2 }, { x: 2, y: -2, z: 2 }],
            []
        );
        globalGC.push(rectFace);

        const triangleFace = Face.fromVertices(
            [{ x: 5, y: -2, z: 0 }, { x: 8, y: -2, z: 0 }, { x: 6.5, y: -2, z: 2 }],
            []
        );
        globalGC.push(triangleFace);

        const dir = new THREE.Vector3(0, 6, 0);

        const material = new THREE.MeshMatcapMaterial({
            matcap: texture,
            color: "#00cfff"
        });

        let groups: BrepGroup[] = [];


        function build() {
            if (groups.length > 0) {
                groups.forEach(group => {
                    app.remove(group);
                    group.dispose();
                });
            };

            const rectPrism =  Modeler.prism(rectFace, dir);
            const rectResult = Shape.toBRepResult(rectPrism, 0.1, 0.5);
            const rectGroup = createBrepGroup(rectPrism, rectResult, material);
            groups.push(rectGroup);
            app.add(rectGroup);

            const trianglePrism = Modeler.prism(triangleFace, dir);
            const triangleResult = Shape.toBRepResult(trianglePrism, 0.1, 0.5);
            const triangleGroup = createBrepGroup(trianglePrism, triangleResult, material);
            groups.push(triangleGroup);
            app.add(triangleGroup);
        }


        const dFolder = gui.addFolder('direction')
        dFolder.add(dir, 'x', -10, 10, 0.01).onChange(build);
        dFolder.add(dir, 'y', -10, 10, 0.01).onChange(build);
        dFolder.add(dir, 'z', -10, 10, 0.01).onChange(build);
        build();

        app.fitToView();
    } catch (error) {
        console.error('Error loading box show case:', error);
    }
}

function unload(context: CaseContext): void {
    app.dispose();
    globalGC.forEach(shape => {
        shape.deleteLater();
    });
    globalGC.length = 0;
}