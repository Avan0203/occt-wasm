import { Case, CaseContext } from '../../router';
import { meshShape } from '../../common/occt-loader';
import { ThreeRenderer } from '../../common/three-renderer';
import { createGeometryFromMesh, createMeshFromGeometry } from '../../common/shape-converter';
import * as THREE from 'three';

let renderer: ThreeRenderer | null = null;

export const boxShowCase: Case = {
    id: 'box-show',
    name: 'Box Show',
    description: 'Show a box',
    load,
    unload
}

async function load(context: CaseContext): Promise<void> {
    const { container, occtModule } = context;
    try {

        container.innerHTML = '';
        renderer = new ThreeRenderer(container)!;


        const box = new occtModule.BRepPrimAPI_MakeBox(2, 2, 2);

        const shape = box.shape();
        const meshData = await meshShape(shape);

        const geometry = createGeometryFromMesh(meshData);
        const mesh = createMeshFromGeometry(geometry);
        renderer!.add(mesh);
    } catch (error) {
        console.error('Error loading box show case:', error);
    }
}

function unload(context: CaseContext): void {
    if (renderer) {
        renderer.dispose();
        renderer = null;
    }
}