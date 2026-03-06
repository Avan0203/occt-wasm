import { Case, CaseContext } from '@/router';
import * as THREE from 'three';
import { createBrepMesh } from '@/common/shape-converter';
import { TopoDS_Shape } from 'public/occt-wasm';
import { BrepMesh } from '@/common/object';
import { App } from '@/common/app';
import { Modeler, Face, Shape, Vector3 } from '@/sdk';

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
    const { container, gui } = context;
    try {
        container.innerHTML = '';

        app = new App(container);

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/matcaps_64px.png');

        const rectFace = Face.fromVertices(
            [new Vector3(-2, -2, 2), new Vector3(-2, -2, -2), new Vector3(2, -2, -2), new Vector3(2, -2, 2)],
            []
        );
        globalGC.push(rectFace);

        const triangleFace = Face.fromVertices(
            [new Vector3(5, -2, 0), new Vector3(8, -2, 0), new Vector3(6.5, -2, 2)],
            []
        );
        globalGC.push(triangleFace);

        const dir = new Vector3(0, 6, 0);

        const material = new THREE.MeshMatcapMaterial({
            matcap: texture,
            color: "#00cfff"
        });

        let groups: BrepMesh[] = [];


        function build() {
            if (groups.length > 0) {
                groups.forEach(group => {
                    app.remove(group);
                    group.dispose();
                });
            };

            const rectPrism =  Modeler.prism(rectFace, dir);
            const rectResult = Shape.toBRepResult(rectPrism.shape, 0.1, 0.5);
            const rectGroup = createBrepMesh(rectPrism.shape, rectResult, material);
            groups.push(rectGroup);
            app.add(rectGroup);
            rectPrism.deleteLater();

            const trianglePrism = Modeler.prism(triangleFace, dir);
            const triangleResult = Shape.toBRepResult(trianglePrism.shape, 0.1, 0.5);
            const triangleGroup = createBrepMesh(trianglePrism.shape, triangleResult, material);
            groups.push(triangleGroup);
            app.add(triangleGroup);
            trianglePrism.deleteLater();
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