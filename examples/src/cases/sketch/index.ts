import {
    Float32BufferAttribute,
    MeshStandardMaterial,
    Plane,
    PlaneHelper,
    Vector3
} from 'three';
import { Case, CaseContext } from '@/router';
import type { TopoDS_Shape } from 'public/occt-wasm';
import { PickType, RenderMode } from '@/common/types';
import { App } from '@/common/app';
import { SketchBuilder } from '@/sdk/sketch';
import { Vector3 as Vec3 } from '@/sdk/vector3';
import { createBrepGroup } from '@/common/shape-converter';

let app: App;

export const sketchCase: Case = {
    id: 'sketch',
    name: 'Sketch',
    description: 'Sketch a shape',
    load,
    unload
}

const globalGC: TopoDS_Shape[] = [];
let keyUpCleanup: (() => void) | null = null;

async function load(context: CaseContext): Promise<void> {
    const { container, occtModule, gui } = context;

    const selectedPoints: Vec3[] = [];
    let isSelectingPoints = false;
    let isPolyline = false;
    try {
        if (keyUpCleanup) {
            keyUpCleanup();
            keyUpCleanup = null;
        }
        container.innerHTML = '';
        app = new App(container)!;

        app.addEventListener('modeChange', (event) => {
            const mode = event.detail.newMode as RenderMode;
            app.setPickType(mode === RenderMode.SKETCH ? PickType.VERTEX : PickType.ALL);

            if (mode === RenderMode.SKETCH) {
                isSelectingPoints = true;
                sketchToolsFolder.show();
                sketchToolsFolder.open();
                planeFolder.show();
                planeFolder.open();
                planeHelper.visible = true;
            } else {
                isSelectingPoints = false;
                sketchToolsFolder.hide();
                planeFolder.hide();
                planeHelper.visible = false;
            }
            selectedPoints.length = 0;
        });

        const builder = SketchBuilder.getInstance();
        const { Shape } = occtModule;
        const material = new MeshStandardMaterial({ color: 0x4a90e2 });

        let drawType: 'line' | 'circle' | 'arc' | 'ellipse' | 'bSpline' | 'polyline' = 'line';

        const params = {
            mode: RenderMode.OBJECT,
            planeNormal: new Vector3(0, 1, 0),
            planeDistance: 0,
            needClose: false,
            updatePlaneHelper: () => {
                params.planeNormal.normalize();
                app.setWorkingPlane(params.planeNormal, params.planeDistance);
                fakePlane.set(params.planeNormal, params.planeDistance);
                planeHelper.updateMatrixWorld(true);
                nx.setValue(params.planeNormal.x);
                ny.setValue(params.planeNormal.y);
                nz.setValue(params.planeNormal.z);

            },
            drawLine: () => {
                drawType = 'line';
                isSelectingPoints = true;
                selectedPoints.length = 0;
            },
            drawCircle: () => {
                drawType = 'circle';
                isSelectingPoints = true;
                selectedPoints.length = 0;
            },
            drawArc: () => {
                drawType = 'arc';
                isSelectingPoints = true;
                selectedPoints.length = 0;
            },
            drawEllipse: () => {
                drawType = 'ellipse';
                isSelectingPoints = true;
                selectedPoints.length = 0;
            },
            drawBSpline: () => {
                drawType = 'bSpline';
                isSelectingPoints = true;
                selectedPoints.length = 0;
            },
            drawPolyline: () => {
                drawType = 'polyline';
                isSelectingPoints = true;
                isPolyline = true;
                selectedPoints.length = 0;
                polylineFolder.show();
                polylineFolder.open();
            },
            buildPolyline: () => {
                if (selectedPoints.length < 2) {
                    console.error('Not enough points to build polyline');
                    return false;
                };
                isPolyline = false;
                polylineFolder.hide();
                polylineFolder.close();
                buildAndRenderSketch();
            }
        };

        const drawFunc = {
            line: () => {
                if (selectedPoints.length < 2) return false;
                builder.beginPath(params.planeNormal);
                builder.moveTo(selectedPoints[0]);
                builder.lineTo(selectedPoints[1]);
                return true;
            },
            circle: () => {
                if (selectedPoints.length < 2) return false;
                builder.beginPath(params.planeNormal);
                builder.moveTo(selectedPoints[0]);
                builder.circle(selectedPoints[0], selectedPoints[1]);
                return true;
            },
            arc: () => {
                if (selectedPoints.length < 3) return false;
                builder.beginPath(params.planeNormal);
                builder.moveTo(selectedPoints[0]);
                builder.arc(selectedPoints[0], selectedPoints[1], selectedPoints[2]);
                return true;
            },
            ellipse: () => {
                if (selectedPoints.length < 3) return false;
                builder.beginPath(params.planeNormal);
                builder.moveTo(selectedPoints[0]);
                const radiusX = selectedPoints[1].distanceTo(selectedPoints[0]);
                const radiusY = selectedPoints[2].distanceTo(selectedPoints[0]);
                builder.ellipse(selectedPoints[0], radiusX, radiusY);
                return true;
            },
            bSpline: () => {
                if (selectedPoints.length < 4) return false;
                builder.beginPath(params.planeNormal);
                builder.moveTo(selectedPoints[0]);
                builder.bSplineFromControlPoints(selectedPoints.slice(1));
                return true;
            },
            polyline: () => {
                builder.beginPath(params.planeNormal);
                builder.moveTo(selectedPoints[0]);
                for (let i = 1; i < selectedPoints.length; i++) {
                    builder.lineTo(selectedPoints[i]);

                }
                if (params.needClose) {
                    builder.closePath();
                }
                return true;
            }
        }

        function buildAndRenderSketch(): void {
            if (!drawFunc[drawType]()) return;

            const sketch = builder.build();
            const shapes = sketch.getShapes();
            if (shapes.length === 0) return;

            for (const shape of shapes) {
                const brepResult = Shape.toBRepResult(shape, 0.1, 0.5);
                const group = createBrepGroup(shape, brepResult, material);
                app.add(group);
            }
            exitSketch();
        }

        function exitSketch(): void {
            selectedPoints.length = 0;
            isSelectingPoints = false;
        }

        app.addEventListener('editClick', (e: CustomEvent) => {
            const { point } = e.detail;
            if (!isSelectingPoints) return;
            selectedPoints.push(new Vec3(point.x, point.y, point.z));
            if (!isPolyline) {
                buildAndRenderSketch();
            }
  
        });

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Escape') exitSketch();
        };
        window.addEventListener('keyup', onKeyUp);
        keyUpCleanup = () => window.removeEventListener('keyup', onKeyUp);

        const fakePlane = new Plane();
        fakePlane.set(params.planeNormal, params.planeDistance)

        const planeHelper = new PlaneHelper(fakePlane, 20, 0x00ff00);
        const positions = [- 1, 1, 0, - 1, - 1, 0, 1, - 1, 0, 1, 1, 0, 1, 1, 0, -1, 1, 0];
        planeHelper.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        app.addHelper(planeHelper);
        planeHelper.visible = false;



        const planeFolder = gui.addFolder('Edit Working Plane');
        const nx = planeFolder.add(params.planeNormal, 'x', -1, 1, 0.01);
        const ny = planeFolder.add(params.planeNormal, 'y', -1, 1, 0.01);
        const nz = planeFolder.add(params.planeNormal, 'z', -1, 1, 0.01);
        planeFolder.add(params, 'planeDistance', -10, 10, 0.01);
        planeFolder.add(params, 'updatePlaneHelper');

        planeFolder.hide();

        const sketchToolsFolder = gui.addFolder('Sketch Tools');
        sketchToolsFolder.add(params, 'drawLine').name('Line');
        sketchToolsFolder.add(params, 'drawCircle').name('Circle');
        sketchToolsFolder.add(params, 'drawArc').name('Arc');
        sketchToolsFolder.add(params, 'drawEllipse').name('Ellipse');
        sketchToolsFolder.add(params, 'drawBSpline').name('BSpline');
        sketchToolsFolder.add(params, 'drawPolyline').name('Polyline');

        sketchToolsFolder.hide();

        const polylineFolder = sketchToolsFolder.addFolder('Polyline');
        polylineFolder.add(params, 'needClose').name('Need Close');
        polylineFolder.add(params, 'buildPolyline').name('Build');

        polylineFolder.hide();



    } catch (error) {
        console.error('Error loading box show case:', error);
    }
}

function unload(): void {
    if (keyUpCleanup) {
        keyUpCleanup();
        keyUpCleanup = null;
    }
    if (app) {
        app.dispose();
        app = undefined!;
    }
    globalGC.forEach(shape => {
        shape.deleteLater();
    });
    globalGC.length = 0;
}