import * as THREE from 'three';
import { Case, CaseContext } from '@/router';
import { createBrepGroup } from '@/common/shape-converter';
import type { TopoDS_Shape, FilletBuilder, ChamferBuilder, TopoDS_Edge } from 'public/occt-wasm';
import { PickType } from '@/common/types';
import { BrepGroup, BrepObjectAll } from '@/common/object';
import { App } from '@/common/app';

let app: App;

export const sketchCase: Case = {
    id: 'sketch',
    name: 'Sketch',
    description: 'Sketch a shape',
    load,
    unload
}

const globalGC: TopoDS_Shape[] = [];

async function load(context: CaseContext): Promise<void> {
    const { container, occtModule, gui } = context;
    try {
        container.innerHTML = '';
        app = new App(container)!;
        app.setPickType(PickType.VERTEX);

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