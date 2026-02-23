import * as THREE from 'three';
import { Case, CaseContext } from '@/router';
import { ThreeRenderer } from '@/common/three-renderer';
import { createBrepGroup } from '@/common/shape-converter';
import type { TopoDS_Shape, FilletBuilder, ChamferBuilder, TopoDS_Edge } from 'public/occt-wasm';
import { PickType } from '@/common/types';
import { BrepGroup, BrepObjectAll } from '@/common/object';
import { App } from '@/common/app';

let app: App;

export const filletChamferCase: Case = {
    id: 'fillet-chamfer',
    name: 'Fillet / Chamfer',
    description: 'Fillet and chamfer a shape',
    load,
    unload
}

const globalGC: TopoDS_Shape[] = [];

async function load(context: CaseContext): Promise<void> {
    const { container, occtModule, gui } = context;
    try {

        const {
            gp_Pnt,
            BRepBuilderAPI_MakeEdge,
            BRepBuilderAPI_MakeWire,
            BRepBuilderAPI_MakeFace,
            BRepPrimAPI_MakeBox,
            BRepPrimAPI_MakePrism,
            Shape,
            gp_Trsf,
            gp_Vec,
            TopLoc_Location,
            FilletBuilder,
            ChamferBuilder,
        } = occtModule

        container.innerHTML = '';
        app = new App(container)!;

        app.setPickType(PickType.EDGE);

        let targetGroup: BrepGroup | null = null;

        app.addEventListener('selection', (event) => {
            const brepObject = event.detail as BrepObjectAll;
            const parent = brepObject.parent as BrepGroup;

            if (targetGroup === null) {
                targetGroup = parent;
            } else if (!targetGroup.shape.isSame(parent.shape)) {
                targetGroup = null;
                app.clearSelection();
                return alert('Please select the same Shape object');
            }
        });

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/matcaps_64px.png');

        const boxShape = new BRepPrimAPI_MakeBox(2, 6, 2).shape();
        const translate = new gp_Vec(0, -2, 0);
        const trsf = new gp_Trsf();
        trsf.setTranslation(translate);
        const location = TopLoc_Location.createWithTrsf(trsf);
        boxShape.setLocation(location);

        trsf.deleteLater();
        translate.deleteLater();
        location.deleteLater();


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
            color: "#a6e22e"
        });


        const direction = new gp_Vec(dir.x, dir.y, dir.z);

        // 场景里所有可被倒角替换的 shape 组，用数组统一管理，替换时只改对应下标
        const shapeGroups: BrepGroup[] = [];

        const rectResult = Shape.toBRepResult(boxShape, 0.1, 0.5);
        const rectGroup = createBrepGroup(boxShape, rectResult, material);
        shapeGroups.push(rectGroup);
        app.add(rectGroup);

        const trianglePrism = new BRepPrimAPI_MakePrism(triangleFace, direction).shape();
        const triangleResult = Shape.toBRepResult(trianglePrism, 0.1, 0.5);
        const triangleGroup = createBrepGroup(trianglePrism, triangleResult, material);
        shapeGroups.push(triangleGroup);
        app.add(triangleGroup);

        direction.deleteLater();

        const params: {
            radius: number;
            distance: number;
            operation: 'fillet' | 'chamfer';
            build: () => void;
        } = {
            radius: 0.5,
            distance: 0.5,
            operation: 'fillet',
            build: () => {
                if (targetGroup === null) {
                    return alert('Please select a Shape object');
                }
                const selectedEdges = app.getSelectionObjects();
                if (selectedEdges.length === 0) {
                    return alert('Please select at least one edge');
                }
                const shapeEdges: TopoDS_Edge[] = Shape.getEdges(targetGroup.shape);
                const edgesToAdd = selectedEdges
                    .map(brepEdge => shapeEdges.find(se => se.isSame(brepEdge.geometry.shape!)))
                    .filter((e): e is TopoDS_Edge => e !== undefined);
                if (edgesToAdd.length === 0) {
                    return alert('Selected edges could not be matched to shape');
                }

                let builder: FilletBuilder | ChamferBuilder;
                if (params.operation === 'fillet') {
                    builder = new FilletBuilder(targetGroup.shape);
                    edgesToAdd.forEach(edge => (builder as FilletBuilder).addConstantRadius(params.radius, edge));
                } else {
                    builder = new ChamferBuilder(targetGroup.shape);
                    edgesToAdd.forEach(edge => (builder as ChamferBuilder).addEqual(params.distance, edge));
                }
                const newShape = builder.build();
                if (newShape.isNull()) {
                    builder.deleteLater();
                    return alert('Fillet/Chamfer failed (e.g. radius/distance too large or invalid edges)');
                }

                const newResult = Shape.toBRepResult(newShape, 0.1, 0.5);
                const newGroup = createBrepGroup(newShape, newResult, material);

                const slotIndex = shapeGroups.indexOf(targetGroup);
                if (slotIndex >= 0) {
                    app.remove(targetGroup);
                    targetGroup.dispose();
                    shapeGroups[slotIndex] = newGroup;
                }
                app.add(newGroup);
                targetGroup = null;
                app.clearSelection();
                builder.deleteLater();
            }
        }



        function updateOperation(operation: 'fillet' | 'chamfer') {
            if (operation === 'fillet') {
                radiusGui.show();
                distanceGui.hide();
            } else {
                radiusGui.hide();
                distanceGui.show();
            }
        }

        gui.add(params, 'operation', ['fillet', 'chamfer']).onChange(updateOperation);
        const radiusGui = gui.add(params, 'radius', 0, 4, 0.01);
        const distanceGui = gui.add(params, 'distance', 0, 4, 0.01);
        gui.add(params, 'build');

        updateOperation(params.operation);

    } catch (error) {
        console.error('Error loading box show case:', error);
    }
}

function unload(): void {
    if (app) {
        app.dispose();
        app = undefined!;
    }
    globalGC.forEach(shape => {
        shape.deleteLater();
    });
    globalGC.length = 0;
}