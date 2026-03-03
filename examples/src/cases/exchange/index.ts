import { Case, CaseContext } from '@/router';
import * as THREE from 'three';
import { App } from '@/common/app';
import { BrepObject } from '@/common/object';
import { shapeNodeToBrepRenderNode, collectShapesFromShapeNode } from '@/common/shape-converter';
import { ShapeNode } from 'public/occt-wasm';

let app: App = null as unknown as App;

let sceneRoot: BrepObject | null = null;

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
        const texture = textureLoader.load('public/matcaps_64px2.png');
        const defaultMaterial = new THREE.MeshMatcapMaterial({
            matcap: texture,
        });

        const importFile = document.createElement('input');
        importFile.type = 'file';
        importFile.accept = fileTypes.map(type => `.${type.toLowerCase()}`).join(',');
        importFile.style.display = 'none';
        importFile.id = 'importFile';
        importFile.multiple = false;

        let globalShapeNode: ShapeNode | undefined;

        fetch('public/test.stp').then(response => response.arrayBuffer()).then(arrayBuffer => {
            const shapeNode = handleImportFile(arrayBuffer, 'STEP');
            console.log('shapeNode: ', shapeNode);
            if (shapeNode) {
                globalShapeNode = shapeNode;
                sceneRoot = shapeNodeToBrepRenderNode(shapeNode, defaultMaterial)
                if (sceneRoot) {
                    app.add(sceneRoot);
                    app.fitToView();
                };
            }
        });

        const params = {
            exportType: 'STEP',
            importFile: () => importFile.click(),
            exportFile: () => {
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
                    case 'BREP': {
                        const shapes = collectShapesFromShapeNode(globalShapeNode);
                        if (shapes.length > 0) {
                            Exchange.exportBREP(shapes);
                        }
                        break;
                    }
                    case 'STL': {
                        const shapes = collectShapesFromShapeNode(globalShapeNode);
                        if (shapes.length > 0) {
                            Exchange.exportSTL(shapes, 0.1, 0.5);
                        }
                        break;
                    }
                }
            }
        };

        function handleImportFile(buffer: ArrayBuffer, type: string): ShapeNode | undefined {
            let shapeNode: ShapeNode | undefined;

            const uint8Array = new Uint8Array(buffer);
            switch (type) {
                case 'STEP':
                    shapeNode = Exchange.importSTEP(uint8Array) ?? undefined;
                    break;
                case 'IGES':
                    shapeNode = Exchange.importIGES(uint8Array) ?? undefined;
                    break;
                case 'BREP': {
                    const topoShape = Exchange.importBREP(uint8Array);
                    shapeNode = {
                        shape: topoShape,
                        name: '',
                        color: undefined,
                        getChildren: () => [],
                    } as unknown as ShapeNode;
                    break;
                }
                case 'STL':
                    shapeNode = Exchange.importSTL(uint8Array) ?? undefined;
                    break;
                default:
                    console.error('Unsupported file type:', type);
                    break;
            }
            return shapeNode;
        }

        importFile.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    if (arrayBuffer) {
                        const shapeNode = handleImportFile(arrayBuffer, file.name.split('.').pop()!.toUpperCase());
                        console.log('shapeNode: ', shapeNode);
                        if (shapeNode) {
                            if (sceneRoot) {
                                app.remove(sceneRoot);
                                sceneRoot.dispose();
                                sceneRoot = null;
                            }
                            globalShapeNode = shapeNode;
                            sceneRoot = shapeNodeToBrepRenderNode(shapeNode, defaultMaterial)
                            if (sceneRoot) {
                                app.add(sceneRoot);
                                app.fitToView();
                            };

                        }
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        };

        gui.add(params, 'exportType', ['STEP', 'IGES', 'BREP', 'STL']);
        gui.add(params, 'importFile').name('Import');
        gui.add(params, 'exportFile').name('Export');

    } catch (error) {
        console.error('Error loading exchange case:', error);
    }
}

function unload(context: CaseContext): void {
    if (app) {
        if (sceneRoot) {
            app.remove(sceneRoot);
            sceneRoot.dispose();
            sceneRoot = null;
        }
        app.dispose();
        app = null as unknown as App;
    }
}
