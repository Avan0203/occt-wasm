import { Case, CaseContext } from '@/router';
import * as THREE from 'three';
import { createBrepGroup } from '@/common/shape-converter';
import { App } from '@/common/app';

let app: App | null = null;

export const boolOperateCase: Case = {
    id: 'bool-operate',
    name: 'Bool Operate',
    description: 'Bool Operate',
    load,
    unload
}

async function load(context: CaseContext): Promise<void> {
    const { container, occtModule } = context;
    try {

        const { Modeler, Shape } = occtModule;

        container.innerHTML = '';
        app = new App(container)!;

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/matcaps_64px.png');

        const material = new THREE.MeshMatcapMaterial({
            matcap: texture,
            color: '#d5fe33'
        });

        // app!.add(group);

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