import { Case, CaseContext } from '../../router';
import { ThreeRenderer } from '../../common/three-renderer';
import * as THREE from 'three';
import { createBrepGroup } from '../../common/shape-converter';

let renderer: ThreeRenderer | null = null;

export const brepShowCase: Case = {
    id: 'brep-show',
    name: 'BRep Show',
    description: 'Show BRep Result',
    load,
    unload
}

async function load(context: CaseContext): Promise<void> {
    const { container, occtModule } = context;
    try {

        container.innerHTML = '';
        renderer = new ThreeRenderer(container)!;

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/matcaps_64px.png');

        const cylinder = new occtModule.BRepPrimAPI_MakeCylinder(1, 2);
        const cylinderShape = cylinder.shape();

        const brepResult = occtModule.Mesher.shapeToBRepResult(cylinderShape, 0.1, 0.5);
        console.log('brepResult: ', brepResult);

        const group = createBrepGroup(cylinderShape, brepResult, new THREE.MeshMatcapMaterial({
            matcap: texture,
            color: '#d5fe33'
        }));

        renderer!.add(group);

    } catch (error) {
        console.error('Error loading box show case:', error);
    }
}

function unload(context: CaseContext): void {
    if (renderer) {
        renderer.dispose();
        renderer.clear();
        renderer = null;
    }
}