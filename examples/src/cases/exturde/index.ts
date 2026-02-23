import { Case, CaseContext } from '@/router';
import { ThreeRenderer } from '@/common/three-renderer';
import * as THREE from 'three';
import { createBrepGroup } from '@/common/shape-converter';
import { TopoDS_Shape } from 'public/occt-wasm';
import { BrepGroup } from '@/common/object';
import { App } from '@/common/app';

let renderer: ThreeRenderer;

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
    const { container, occtModule, gui } = context;
    try {

        const {
            gp_Pnt,
            gp_Vec,
            BRepBuilderAPI_MakeEdge,
            BRepBuilderAPI_MakeWire,
            BRepBuilderAPI_MakeFace,
            BRepPrimAPI_MakePrism,
            Shape,
        } = occtModule

        container.innerHTML = '';

        app = new App(container);

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/matcaps_64px.png');


        const a = new gp_Pnt(-2, -2, 2);
        const b = new gp_Pnt(-2, -2, -2);
        const c = new gp_Pnt(2, -2, -2);
        const d = new gp_Pnt(2, -2, 2);

        const ab = new BRepBuilderAPI_MakeEdge(a, b).edge();
        const bc = new BRepBuilderAPI_MakeEdge(b, c).edge();
        const cd = new BRepBuilderAPI_MakeEdge(c, d).edge();
        const da = new BRepBuilderAPI_MakeEdge(d, a).edge();

        const wire = new BRepBuilderAPI_MakeWire(ab, bc, cd, da).wire();

        const rectFace = BRepBuilderAPI_MakeFace.createFromWire(wire, true).face();

        a.deleteLater();
        b.deleteLater();
        c.deleteLater();
        d.deleteLater();
        ab.deleteLater();
        bc.deleteLater();
        cd.deleteLater();
        da.deleteLater();
        wire.deleteLater();
        globalGC.push(rectFace);

        const a1 = new gp_Pnt(5, -2, 0);
        const b1 = new gp_Pnt(8, -2, 0);
        const c1 = new gp_Pnt(6.5, -2, 2);

        const ab1 = new BRepBuilderAPI_MakeEdge(a1, b1).edge();
        const bc1 = new BRepBuilderAPI_MakeEdge(b1, c1).edge();
        const ca1 = new BRepBuilderAPI_MakeEdge(c1, a1).edge();
;
        const triangleWire = new BRepBuilderAPI_MakeWire(ab1, bc1, ca1).wire();
        const triangleFace = BRepBuilderAPI_MakeFace.createFromWire(triangleWire, true).face();

        a1.deleteLater();
        b1.deleteLater();
        c1.deleteLater();
        ab1.deleteLater();
        bc1.deleteLater();
        ca1.deleteLater();
        triangleWire.deleteLater();
        globalGC.push(triangleFace);

        const dir = new THREE.Vector3(0, 6, 0);

        const material = new THREE.MeshMatcapMaterial({
            matcap: texture,
            color: "#00cfff"
        });

        let groups: BrepGroup[] = [];


        function build() {
            if (groups.length > 0) {
                groups.forEach(group => {
                    renderer!.remove(group);
                    group.dispose();
                });
            };
            const direction = new gp_Vec(dir.x, dir.y, dir.z);

            const rectPrism = new BRepPrimAPI_MakePrism(rectFace, direction).shape();
            const rectResult = Shape.toBRepResult(rectPrism, 0.1, 0.5);
            const rectGroup = createBrepGroup(rectPrism, rectResult, material);
            groups.push(rectGroup);
            app.add(rectGroup);

            const trianglePrism = new BRepPrimAPI_MakePrism(triangleFace, direction).shape();
            const triangleResult = Shape.toBRepResult(trianglePrism, 0.1, 0.5);
            const triangleGroup = createBrepGroup(trianglePrism, triangleResult, material);
            groups.push(triangleGroup);
            app.add(triangleGroup);

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
    app.dispose();
    globalGC.forEach(shape => {
        shape.deleteLater();
    });
    globalGC.length = 0;
}