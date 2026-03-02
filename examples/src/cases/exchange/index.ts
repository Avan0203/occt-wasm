import { Case, CaseContext } from '@/router';
import * as THREE from 'three';
import { App } from '@/common/app';
import { BrepGroup } from '@/common/object';
import { ShapeNode } from 'public/occt-wasm';

let app: App = null as unknown as App;

let group: BrepGroup | null = null;

export const exChangeCase: Case = {
    id: 'exchange',
    name: 'Exchange',
    description: 'Exchange data between different file types, support STEP, IGES, BREP, STL',
    load,
    unload
}

async function load(context: CaseContext): Promise<void> {
    const { container, occtModule, gui } = context;
    try {

        container.innerHTML = '';
        app = new App(container)!;

        const fileTypes = ['STEP', 'IGES', 'BREP', 'STL'];



        const { Exchange } = occtModule;

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/matcaps_64px2.png');

        const material = new THREE.MeshMatcapMaterial({
            matcap: texture,
        });

        const importFile = document.createElement('input');
        importFile.type = 'file';
        importFile.accept = fileTypes.map(type => `.${type.toLowerCase()}`).join(',');
        importFile.style.display = 'none';
        importFile.id = 'importFile';
        importFile.multiple = false;

        let globalShapeNode: ShapeNode | undefined;

        const params = {
            exportType: 'STEP',
        }

        function handleImportFile(buffer: ArrayBuffer, type: string) {
            let shapeNode: ShapeNode | undefined;

            const uint8Array = new Uint8Array(buffer);
            switch (type) {
                case 'STEP':
                    shapeNode = Exchange.importSTEP(uint8Array);
                    break;
                case 'IGES':
                    shapeNode = Exchange.importIGES(uint8Array);
                    break;
                case 'BREP':
                    const topoShape = Exchange.importBREP(uint8Array);
                    shapeNode = {
                        shape: topoShape,
                        name: '',
                        color: undefined,
                        getChildren: () => [],
                    } as unknown as ShapeNode;
                    break;
                case 'STL':
                    shapeNode = Exchange.importSTL(uint8Array);
                    break;
                default:
                    console.error('Unsupported file type:', type);
                    break;
            }
            return shapeNode;
        }

        function handleExportFile() {
            if (!globalShapeNode) {
                console.error('No shape node to export');
                return;
            }

            switch (params.exportType) {
                case 'STEP':
                    Exchange.exportSTEP(globalShapeNode);
                    break;
                case 'IGES':
                    Exchange.exportIGES(globalShapeNode);
                    break;
                case 'BREP':
                    Exchange.exportBREP(globalShapeNode.shape!);
                    break;
                case 'STL':
                    Exchange.exportSTL([globalShapeNode.shape!], 0.1, 0.5);
                    break;
            }
        }

        importFile.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    if (arrayBuffer) {
                        const shapeNode = handleImportFile(arrayBuffer, file.name.split('.').pop()!.toUpperCase());
                    }
                }
            }
        }

        const params = {
            importFile: null,
            exportFile: null,
        }

        gui.add(params, 'importFile');
        gui.add(params, 'exportFile');

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