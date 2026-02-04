import * as THREE from 'three';
import { Case, CaseContext } from '@/router';
import { ThreeRenderer } from '@/common/three-renderer';
import { createBrepGroup } from '@/common/shape-converter';
import type { TopoDS_Shape, FilletBuilder, ChamferBuilder, TopoDS_Edge } from 'public/occt-wasm';
import { BrepGroup, BrepEdge, BrepObject, PickType } from '@/common/types';

let renderer: ThreeRenderer;

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
            Mesher,
            gp_Trsf,
            gp_Vec,
            TopLoc_Location,
            FilletBuilder,
            ChamferBuilder,
        } = occtModule

        container.innerHTML = '';
        renderer = new ThreeRenderer(container)!;

        renderer.setPickType(PickType.EDGE);

        let targetGroup: BrepGroup | null = null;

        renderer.addEventListener('selection', (event) => {
            const brepObject = event.detail as BrepObject;
            const parent = brepObject.parent as BrepGroup;

            if (targetGroup === null) {
                targetGroup = parent;
            } else if (!targetGroup.shape.isSame(parent.shape)) {
                targetGroup = null;
                renderer.clearSelection();
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

        const rectResult = Mesher.shapeToBRepResult(boxShape, 0.1, 0.5);
        let rectGroup = createBrepGroup(boxShape, rectResult, material);
        rectGroup.shape = boxShape;
        renderer.add(rectGroup);

        const trianglePrism = new BRepPrimAPI_MakePrism(triangleFace, direction).shape();
        const triangleResult = Mesher.shapeToBRepResult(trianglePrism, 0.1, 0.5);
        let triangleGroup = createBrepGroup(trianglePrism, triangleResult, material);
        renderer.add(triangleGroup);

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
                const selectedEdges = renderer.getSelectionObjects() as BrepEdge[];
                if (selectedEdges.length === 0) {
                    return alert('Please select at least one edge');
                }
        
                let builder: FilletBuilder | ChamferBuilder;

                if (params.operation === 'fillet') {
                    builder = new FilletBuilder(targetGroup.shape);
                    selectedEdges.forEach(edge => (builder as FilletBuilder).addConstantRadius(params.radius, edge.geometry.shape));
                } else {
                    builder = new ChamferBuilder(targetGroup.shape);
                    selectedEdges.forEach(edge => (builder as ChamferBuilder).addEqual(params.distance, edge.geometry.shape));
                }
                const newShape = builder.build();
                if (newShape.isNull()) {
                    builder.deleteLater();
                    return alert('Fillet/Chamfer failed (e.g. radius/distance too large or invalid edges)');
                }
                const newResult = Mesher.shapeToBRepResult(newShape, 0.1, 0.5);
                const newGroup = createBrepGroup(newShape, newResult, material);
                if(targetGroup === rectGroup){
                    renderer.remove(rectGroup);
                    rectGroup.dispose();
                }else if(targetGroup === triangleGroup){
                    renderer.remove(triangleGroup);
                    triangleGroup.dispose();
                }
                renderer.add(newGroup);
                targetGroup = null;
                renderer.clearSelection();

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
    if (renderer) {
        renderer.dispose();
        renderer.clear();
        (renderer as any) = null;
    }
    globalGC.forEach(shape => {
        shape.deleteLater();
    });
    globalGC.length = 0;
}