/*
 * @Author: wuyifan wuyifan@udschina.com
 * @Date: 2026-01-20 15:24:26
 * @LastEditors: wuyifan wuyifan@udschina.com
 * @LastEditTime: 2026-01-22 17:53:12
 * @FilePath: \occt-wasm\examples\src\cases\box-show\index.ts
//  * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Case, CaseContext } from '../../router';
import { ThreeRenderer } from '../../common/three-renderer';
import * as THREE from 'three';
import { createMeshFromGeometry, parseBRepResult } from '../../common/shape-converter';

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


        const cylinder = new occtModule.BRepPrimAPI_MakeCylinder(1, 2);
        const cylinderShape = cylinder.shape();

        const brepResult = occtModule.Mesher.shapeToBRepResult(cylinderShape, 0.1, 0.5);
        console.log('brepResult: ', brepResult);

        const bRep = parseBRepResult(brepResult);
        console.log('bRep: ', bRep);

        const { points, lines, faces } = bRep;

        const pointGeometry = new THREE.Points(points, new THREE.PointsMaterial({ color: 0x000000, size: 0.01 }));

        const lineGeometry = new THREE.LineLoop(lines, new THREE.LineBasicMaterial({ color: 0x000000 }));

        const faceGeometry = new THREE.Mesh(faces, [
            new THREE.MeshStandardMaterial({ color: 0x4a90e2 }),
            new THREE.MeshStandardMaterial({ color: 0xff90e2 }),
            new THREE.MeshStandardMaterial({ color: 0x4a00ff }),
        ]);

        const group = new THREE.Group();
        group.add(pointGeometry);
        group.add(lineGeometry);
        group.add(faceGeometry);

        renderer!.add(group);

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