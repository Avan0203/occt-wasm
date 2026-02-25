import { Case, CaseContext } from '@/router';
import * as THREE from 'three';
import { createBrepGroup } from '@/common/shape-converter';
import { App } from '@/common/app';
import { BrepGroup } from '@/common/object';

let app: App = null as unknown as App;

let group: BrepGroup | null = null;

export const brepShowCase: Case = {
    id: 'brep-show',
    name: 'BRep Show',
    description: 'Show BRep Result',
    load,
    unload
}

async function load(context: CaseContext): Promise<void> {
    const { container, occtModule , gui } = context;
    try {

        container.innerHTML = '';
        app = new App(container)!;

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/matcaps_64px.png');

        const material = new THREE.MeshMatcapMaterial({
            matcap: texture,
            color: '#d5fe33'
        });

        const params = {
            lineDeflection:0.1,
            angleDeviation:0.5,
        }

        function build() {
            if (group) {
                app.remove(group);
                group.dispose();
            }
            const cylinder = new occtModule.BRepPrimAPI_MakeCylinder(1, 2);
            const cylinderShape = cylinder.shape();
            const brepResult = occtModule.Shape.toBRepResult(cylinderShape, params.lineDeflection, params.angleDeviation);
            group = createBrepGroup(cylinderShape, brepResult, material);
            app!.add(group);
        }

        gui.add(params, 'lineDeflection', 0.1, 1, 0.1).onFinishChange(build);
        gui.add(params, 'angleDeviation', 0.1, 1, 0.1).onFinishChange(build);

        build();

    } catch (error) {
        console.error('Error loading box show case:', error);
    }
}

function unload(context: CaseContext): void {
    if (app) {
        if (group) {
            app.remove(group);
            group.dispose();
            group = null;
        }
        app.dispose();
        app = null as unknown as App;
    }
}