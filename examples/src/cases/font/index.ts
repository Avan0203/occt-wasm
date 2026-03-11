import { Case, CaseContext } from '@/router';
import { createBrepMesh } from '@/common/shape-converter';
import * as THREE from 'three';
import { App } from '@/common/app';
import { FontsBuilder } from '@/sdk/font';
import { Shape } from '@/sdk';
import type { BrepMesh } from '@/common/object';
import type { TopoDS_Compound } from 'public/occt-wasm';

const DEFAULT_TEXT = '你好，occt-wasm';
const FONT_SIZE = 2;

let app: App | null = null;
let currentMesh: BrepMesh | null = null;
let currentShape: TopoDS_Compound | null = null;

async function load(context: CaseContext): Promise<void> {
    const { container, gui } = context;

    try {
        container.innerHTML = '';
        app = new App(container);

        const material = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });

        const params = {
            text: DEFAULT_TEXT,
            build: () => {
                if (!app) return;
                if (currentMesh) {
                    app.remove(currentMesh);
                    currentMesh.dispose();
                    currentMesh = null;
                }
                if (currentShape && !currentShape.isDeleted()) {
                    currentShape.deleteLater();
                    currentShape = null;
                }
                const text = String(params.text || '').trim();
                if (!text) return;
                const builder = FontsBuilder.getInstance();
                const fonts = builder.createFonts(text, FONT_SIZE);
                const shape = fonts.getShape();
                currentShape = shape;
                const brepResult = Shape.toBRepResult(shape, 0.1, 0.5);
                currentMesh = createBrepMesh(shape, brepResult, material);
                app.add(currentMesh);
                app.fitToView();
            },
        };

        gui.add(params, 'text').name('Text');
        gui.add(params, 'build').name('Build');

        params.build();
    } catch (error) {
        console.error('[Font] Failed to load case:', error);
        container.innerHTML = `<div style="color: red; padding: 20px;">Error: ${error instanceof Error ? error.message : String(error)}</div>`;
        throw error;
    }
}

function unload(): void {
    if (currentShape && !currentShape.isDeleted()) {
        currentShape.deleteLater();
        currentShape = null;
    }
    currentMesh = null;
    if (app) {
        app.dispose();
        app = null;
    }
}

export const fontCase = {
    id: 'font',
    name: 'Font',
    description: `draw text wires`,
    load,
    unload,
};
