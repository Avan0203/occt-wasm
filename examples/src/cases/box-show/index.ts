import { Case, CaseContext } from '../../router';
import { meshShape } from '../../common/occt-loader';
import { ThreeRenderer } from '../../common/three-renderer';
import { createGeometryFromMesh, createMeshFromGeometry } from '../../common/shape-converter';

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

        const boxShape = box.shape();
        console.log('boxShape: ', boxShape.shapeTypeString());

        const meshData = await meshShape(boxShape);
        console.log('meshData: ', meshData);

        const brepResult = occtModule.Mesher.shapeToBRepResult(boxShape, 0.1, 0.5);
        console.log(brepResult, 'brepResult');

        const wires = occtModule.Mesher.getWires(boxShape);
        console.log(wires, 'wires');

        const faces = occtModule.Mesher.getFaces(boxShape);
        console.log(faces, 'faces');


        //圆柱
        const cylinder = new occtModule.BRepPrimAPI_MakeCylinder(1, 2);
        const cylinderShape = cylinder.shape();
        const meshData2 = await meshShape(cylinderShape);
        console.log('meshData2: ', meshData2);

        const brepResult2 = occtModule.Mesher.shapeToBRepResult(cylinderShape, 0.1, 0.5);
        console.log('brepResult2: ', brepResult2);

        const wires2 = occtModule.Mesher.getWires(cylinderShape);
        console.log(wires2, 'wires2');

        const faces2 = occtModule.Mesher.getFaces(cylinderShape);
        console.log(faces2, 'faces2');


        const geometry = createGeometryFromMesh(meshData);
        const mesh = createMeshFromGeometry(geometry);
        const geometry2 = createGeometryFromMesh(meshData2);
        const mesh2 = createMeshFromGeometry(geometry2);
        mesh2.position.set(0, 0, 4);

        renderer!.add(mesh2);

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