import { Case, CaseContext } from '@/router';
import * as THREE from 'three';
import { App } from '@/common/app';
import { BrepObject } from '@/common/object';
import { createBrepMesh, shapeNodeToBrepRenderNode } from '@/common/shape-converter';
import { ShapeFactory, Shape, Exchange } from '@/sdk';
import { ShapeNode, TopoDS_Solid } from 'public/occt-wasm';

let app: App | null = null;

/** 通过 ShapeFactory 创建 TopoDS_Solid 的工厂函数类型 */
type SolidFactory = () => TopoDS_Solid;

/** 虚拟根节点的 children 列表，仅用于序列化 */
let rootChildren: ShapeNode[] = [];
let rootNode: ShapeNode & { clear(): void } | null = null;

/** 手动添加的基本体在场景中的渲染对象列表，便于清理 */
let primitiveObjects: BrepObject[] = [];

/** 通过 JSON 反序列化得到的 ShapeNode 根在场景中的渲染对象 */
let importedRootObject: BrepObject | null = null;

let defaultMaterial: THREE.MeshMatcapMaterial | null = null;

/** 懒初始化虚拟根 ShapeNode：无 shape，仅提供 name 与 getChildren */
function ensureRootNode(): ShapeNode & { clear(): void } {
    if (rootNode) return rootNode;
    rootChildren = [];
    rootNode = {
        shape: undefined,
        name: 'Root',
        color: undefined,
        getChildren: () => rootChildren,
        clear: () => rootChildren.length = 0,
    } as unknown as ShapeNode & { clear(): void };
    return rootNode;
}

function createMaterial(color: number): THREE.MeshMatcapMaterial {
    const material = defaultMaterial!.clone();
    material.color.set(color);
    return material;
}

function addPrimitiveToScene(
    name: string,
    color: number,
    solidFactory: SolidFactory,
): void {
    if (!app) return;

    // 使用同一个 shape 既参与渲染，也挂在 ShapeNode 树上，
    // 这样通过 TransformControls 修改位置时，BrepMesh._syncTransform 会把位姿写回 shape，
    // 导出 BRep 时就能保留当前 location。
    const shape = solidFactory();

    const root = ensureRootNode();
    const childNode = {
        shape,
        name,
        color,
        getChildren: () => [],
    } as unknown as ShapeNode;
    root.getChildren().push(childNode);

    const material = createMaterial(color);
    const brepResult = Shape.toBRepResult(shape, 0.1, 0.5);
    const mesh = createBrepMesh(shape, brepResult, material);
    mesh.name = name;
    app.add(mesh);
    primitiveObjects.push(mesh);
    app.fitToView();
}

async function load(context: CaseContext): Promise<void> {
    const { container, gui } = context;
    try {
        container.innerHTML = '';
        app = new App(container)!;

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('public/matcaps_64px2.png');
        defaultMaterial = new THREE.MeshMatcapMaterial({
            matcap: texture,
        });

        // 文件导入 input（仅用于 JSON 导入）
        const importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.accept = '.json,application/json';
        importInput.style.display = 'none';
        container.appendChild(importInput);

        const params = {
            addBox: () => {
                addPrimitiveToScene('Box', 0x4a90e2, () => ShapeFactory.Box(2, 2, 2));
            },
            addSphere: () => {
                addPrimitiveToScene('Sphere', 0x50c878, () => ShapeFactory.Sphere(1));
            },
            addCylinder: () => {
                addPrimitiveToScene('Cylinder', 0xe74c3c, () => ShapeFactory.Cylinder(1, 2));
            },
            addCone: () => {
                addPrimitiveToScene('Cone', 0xff9900, () => ShapeFactory.Cone(1, 0, 2));
            },
            addTorus: () => {
                addPrimitiveToScene('Torus', 0x9b59b6, () => ShapeFactory.Torus(1, 0.5));
            },
            exportJSON: () => {
                const root = ensureRootNode();
                if (!root.getChildren().length) {
                    console.warn('[Serialize] No primitives to export.');
                }
                const json = Exchange.serializeToCustomFormat(root);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'scene.json';
                a.click();
                URL.revokeObjectURL(url);
            },
            importJSON: () => {
                importInput.click();
            },
        };

        importInput.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                if (!text) return;

                try {
                    const root = ensureRootNode();
                    const newRoot = Exchange.deserializeFromCustomFormat(text);
                    root.clear();
                    root.getChildren().push(...newRoot.getChildren());

                    if (!app) return;

                    // 清理旧的手动基本体与旧的导入对象
                    primitiveObjects.forEach((obj) => {
                        app!.remove(obj);
                        obj.dispose();
                    });
                    primitiveObjects = [];

                    if (importedRootObject) {
                        app.remove(importedRootObject);
                        importedRootObject.dispose();
                        importedRootObject = null;
                    }

                    const renderRoot = shapeNodeToBrepRenderNode(newRoot, defaultMaterial!);
                    importedRootObject = renderRoot;
                    app.add(renderRoot);
                    app.fitToView();
                } catch (error) {
                    console.error('[Serialize] Failed to import JSON:', error);
                }
            };
            reader.readAsText(file);
        };

        gui.add(params, 'addBox').name('Add Box');
        gui.add(params, 'addSphere').name('Add Sphere');
        gui.add(params, 'addCylinder').name('Add Cylinder');
        gui.add(params, 'addCone').name('Add Cone');
        gui.add(params, 'addTorus').name('Add Torus');
        gui.add(params, 'exportJSON').name('Export JSON');
        gui.add(params, 'importJSON').name('Import JSON');
    } catch (error) {
        console.error('[Serialize] Failed to load case:', error);
        container.innerHTML = `<div style="color: red; padding: 20px;">Error: ${error instanceof Error ? error.message : String(error)}</div>`;
        throw error;
    }
}

async function unload(context: CaseContext): Promise<void> {
    if (app) {
        primitiveObjects.forEach((obj) => {
            app!.remove(obj);
            obj.dispose();
        });
        primitiveObjects = [];

        if (importedRootObject) {
            app.remove(importedRootObject);
            importedRootObject.dispose();
            importedRootObject = null;
        }

        app.dispose();
        app = null;
    }

    rootNode = null;
    rootChildren = [];
    defaultMaterial!.dispose();
    defaultMaterial = null;
}

export const serializeCase: Case = {
    id: 'serialize',
    name: 'Serialize',
    description: 'Create primitives via ShapeFactory and export/import as custom ShapeNode JSON',
    load,
    unload,
};

