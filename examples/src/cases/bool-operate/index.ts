import { Case, CaseContext } from '@/router';
import * as THREE from 'three';
import { createBrepGroup } from '@/common/shape-converter';
import { App } from '@/common/app';
import { gc } from '@/sdk';

let app: App | null = null;

export const boolOperateCase: Case = {
    id: 'bool-operate',
    name: 'Bool Operate',
    description: 'Bool Operate',
    load,
    unload
}

async function load(context: CaseContext): Promise<void> {
    const { container, occtModule, gui } = context;
    try {

        const {
            Modeler,
            Shape,
            BRepPrimAPI_MakeBox,
            BRepPrimAPI_MakeSphere,
            BRepPrimAPI_MakeCone
        } = occtModule;
        const params = {
            operation: 'union',
            addBox: () => {
                gc((c)=>{
                    const maker = c(new BRepPrimAPI_MakeBox(2, 2, 2));
                    const shape = maker.shape();
                    const brepResult = Shape.toBRepResult(shape, 0.1, 0.5);
                    const group = createBrepGroup(shape, brepResult, material);
                    app!.add(group);
                })
            },
            addSphere: () => {
                gc((c)=>{
                    const maker = c(new BRepPrimAPI_MakeSphere(1.5));
                    const shape = maker.shape();
                    const brepResult = Shape.toBRepResult(shape, 0.1, 0.5);
                    const group = createBrepGroup(shape, brepResult, material);
                    app!.add(group);
                })
            },
            addCone: () => {
                gc((c)=>{
                    const maker = c(new BRepPrimAPI_MakeCone(1, 0.3, 1.5));
                    const shape = maker.shape();
                    const brepResult = Shape.toBRepResult(shape, 0.1, 0.5);
                    const group = createBrepGroup(shape, brepResult, material);
                    app!.add(group);
                })
            },
            build: () => {

            }
        }

        container.innerHTML = '';
        app = new App(container)!;

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/matcaps_64px.png');

        const material = new THREE.MeshMatcapMaterial({
            matcap: texture,
            color: '#d5fe33'
        });

        const shapeFolder = gui.addFolder('Shape');
        shapeFolder.add(params, 'addBox').name('Box');
        shapeFolder.add(params, 'addSphere').name('Sphere');
        shapeFolder.add(params, 'addCone').name('Cone');
        shapeFolder.open();

        const boolFolder = gui.addFolder('Bool');
        boolFolder.add(params, 'operation', ['union', 'intersection', 'difference']);
        boolFolder.add(params, 'build');
        boolFolder.open();



    } catch (error) {
        console.error('Error loading box show case:', error);
    }
}

function unload(context: CaseContext): void {
    if (app) {
        app.dispose();
        app = null;
    }
}