/*
 * @Author: wuyifan wuyifan@udschina.com
 * @Date: 2026-01-20 15:24:26
 * @LastEditors: wuyifan wuyifan@udschina.com
 * @LastEditTime: 2026-01-27 17:49:22
 * @FilePath: \occt-wasm\examples\src\cases\box-show\index.ts
//  * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Case, CaseContext } from '../../router';
import { ThreeRenderer } from '../../common/three-renderer';
import * as THREE from 'three';
import { BrepMeshGroup, createBrepMesh } from '../../common/shape-converter';

let renderer: ThreeRenderer | null = null;

export const exturdeCase: Case = {
    id: 'exturde',
    name: 'Exturde',
    description: 'Exturde a face',
    load,
    unload
}

async function load(context: CaseContext): Promise<void> {
    const { container, occtModule, gui } = context;
    try {

        const {
            gp_Pnt,
            gp_Vec,
            BRepBuilderAPI_MakeEdge,
            BRepBuilderAPI_MakeWire,
            BRepBuilderAPI_MakeFace,
            BRepPrimAPI_MakePrism,
            Mesher
        } = occtModule

        container.innerHTML = '';
        renderer = new ThreeRenderer(container)!;

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('../../public/matcaps_64px.png');


        const a = new gp_Pnt(-2, -2, 2);
        const b = new gp_Pnt(-2, -2, -2);
        const c = new gp_Pnt(2, -2, -2);
        const d = new gp_Pnt(2, -2, 2);

        const ab = new BRepBuilderAPI_MakeEdge(a, b).edge();
        const bc = new BRepBuilderAPI_MakeEdge(b, c).edge();
        const cd = new BRepBuilderAPI_MakeEdge(c, d).edge();
        const da = new BRepBuilderAPI_MakeEdge(d, a).edge();

        const wire = new BRepBuilderAPI_MakeWire(ab, bc, cd, da).wire();

        const face = BRepBuilderAPI_MakeFace.createFromWire(wire, true).face();

        a.deleteLater();
        b.deleteLater();
        c.deleteLater();
        d.deleteLater();
        ab.deleteLater();
        bc.deleteLater();
        cd.deleteLater();
        da.deleteLater();
        wire.deleteLater();


        const dir = new THREE.Vector3(0, 6, 0);

        const material = new THREE.MeshMatcapMaterial({
            matcap: texture,
            color:"#51a3ff"
        });

        let group: BrepMeshGroup | null = null;


        function build() {
            if (group) {
                renderer?.remove(group);
                group.dispose();
                group = null;
            };
            const direction = new gp_Vec(dir.x, dir.y, dir.z);
            const prism = new BRepPrimAPI_MakePrism(face, direction).shape();

            const brepResult = Mesher.shapeToBRepResult(prism, 0.1, 0.5);
            group = createBrepMesh(brepResult, material);
            renderer?.add(group);
            prism.deleteLater();
            direction.deleteLater();
        }


        const dFolder = gui.addFolder('direction')
        dFolder.add(dir, 'x', -10, 10, 0.01).onChange(build);
        dFolder.add(dir, 'y', -10, 10, 0.01).onChange(build);
        dFolder.add(dir, 'z', -10, 10, 0.01).onChange(build);
        build();

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