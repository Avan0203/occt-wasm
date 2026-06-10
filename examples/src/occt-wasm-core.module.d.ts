declare module 'public/occt-wasm-core.js' {
    import type { MainModule } from 'public/occt-wasm';

    export default function MainModuleFactory(
        moduleOverrides?: Partial<EmscriptenModule>,
    ): Promise<MainModule>;
}
