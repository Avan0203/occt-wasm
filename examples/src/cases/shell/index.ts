import * as THREE from 'three';
import { Case, CaseContext } from '@/router';
import { createBrepMesh } from '@/common/shape-converter';
import { BrepMesh } from '@/common/object';
import { App } from '@/common/app';
import { Axis1, ShapeFactory, Vector3, Modeler, Shape } from '@/sdk';

let app: App;

export const shellCase: Case = {
    id: 'shell',
    name: 'Shell',
    description: 'Create a shell from a Body',
    load,
    unload
}


async function load(context: CaseContext): Promise<void> {
    const { container, gui } = context;
    try {

        container.innerHTML = '';
        app = new App(container)!;

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/matcaps_64px2.png');

        const axis = new Axis1(new Vector3(0, 0, 0), new Vector3(0, 1, 0));

        const axesHelper = new THREE.ArrowHelper(new THREE.Vector3().copy(axis.direction), new THREE.Vector3().copy(axis.origin), 120, 0x00ffff);
        app.addHelper(axesHelper);

        const boxMaterial = new THREE.MeshMatcapMaterial({
            matcap: texture,
            side: 2,
            transparent: true,
            opacity: 0.5
        });

        const cylinderMaterial = boxMaterial.clone();
        cylinderMaterial.side = 0;
        cylinderMaterial.transparent = false;

        let boxMesh: BrepMesh | null = null;
        let cylinderMesh: BrepMesh | null = null;
        let boxShellMesh: BrepMesh | null = null;
        let cylinderShellMesh: BrepMesh | null = null;


        const params: {
            thickness: number;
            build: () => void;
        } = {
            thickness: 0.5,
            build: () => {
                [boxMesh, cylinderMesh, boxShellMesh, cylinderShellMesh].forEach(mesh => {
                    if (mesh) {
                        app.remove(mesh);
                        mesh.dispose();
                        mesh = null;
                    }
                });


                const box = ShapeFactory.Box(4, 4, 4);
                boxMesh = createBrepMesh(box, Shape.toBRepResult(box, 0.1, 0.5), boxMaterial);
                boxMesh.visible = false;
                app.add(boxMesh);

                const boxShellResult = Modeler.thickSolid(box, [], params.thickness, 1e-6);
                if (!boxShellResult.status) {
                    alert(boxShellResult.message);
                }
                boxShellMesh = createBrepMesh(boxShellResult.shape, Shape.toBRepResult(boxShellResult.shape, 0.1, 0.5), boxMaterial);
                boxShellMesh.position.set(-2, -2, -2);
                app.add(boxShellMesh);

                const cylinder = ShapeFactory.Cylinder(2, 4);
                cylinderMesh = createBrepMesh(cylinder, Shape.toBRepResult(cylinder, 0.1, 0.5), cylinderMaterial);
                cylinderMesh.visible = false;
                app.add(cylinderMesh);

                const cylinderLeftFace = cylinderMesh.faces[1];
                const cylinderShellResult = Modeler.thickSolid(cylinder, [cylinderLeftFace.shape!], params.thickness, 1e-6);
                if (!cylinderShellResult.status) {
                    alert(cylinderShellResult.message);
                }
                cylinderShellMesh = createBrepMesh(cylinderShellResult.shape, Shape.toBRepResult(cylinderShellResult.shape, 0.1, 0.5), cylinderMaterial);
                cylinderShellMesh.position.set(0, 0, 4);
                app.add(cylinderShellMesh);
            }
        }

        params.build();


        gui.add(params, 'thickness', -2, 2, 0.01);
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
    }
}