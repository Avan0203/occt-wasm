import { Case, CaseContext } from '@/router';
import * as THREE from 'three';
import { createBrepGroup } from '@/common/shape-converter';
import { App } from '@/common/app';
import { ShapeFactory } from '@/sdk';
import { BrepGroup } from '@/common/object';

let app: App = null as unknown as App;

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
        } = occtModule;
        const params = {
            operation: 'union',
            addBox: () => {
                const shape = ShapeFactory.Box(2, 2, 2);
                const brepResult = Shape.toBRepResult(shape, 0.1, 0.5);
                const group = createBrepGroup(shape, brepResult, material);
                app.add(group);
            },
            addSphere: () => {
                const shape = ShapeFactory.Sphere(1.5);
                const brepResult = Shape.toBRepResult(shape, 0.1, 0.5);
                const group = createBrepGroup(shape, brepResult, material);
                app!.add(group);
            },
            addCone: () => {
                const shape = ShapeFactory.Cone(1, 0.3, 1.5);
                const brepResult = Shape.toBRepResult(shape, 0.1, 0.5);
                const group = createBrepGroup(shape, brepResult, material);
                app!.add(group);
            },
            build: () => {
                const selection = app.getSelectionObjects();
                if (selection.length < 2) {
                    alert('Please select at least 2 objects');
                    return;
                }
                if(!selection.every(item => item instanceof BrepGroup)){
                    alert('Please select objects on OBJECT Mode');
                    return;
                }

                console.log(selection);
                const compare = selection[0] as BrepGroup;
                const target = selection[1] as BrepGroup;

                const result = (() => { 
                    switch(params.operation as 'union' | 'intersection' | 'difference'){
                        case 'union':
                            return Modeler.union([compare.shape], [target.shape], Number.EPSILON);
                        case 'intersection':
                            return Modeler.intersection([compare.shape], [target.shape], Number.EPSILON);
                        case 'difference':
                            return Modeler.difference([compare.shape], [target.shape], Number.EPSILON);
                    }
                })();

                if(result.isNull()){
                    alert('Boolean operation failed');
                    return;
                }

                app.remove(compare);
                app.remove(target);
                const group = createBrepGroup(result, Shape.toBRepResult(result, 0.1, 0.5), material);
                app.add(group);
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
        app = null as unknown as App;
    }
}