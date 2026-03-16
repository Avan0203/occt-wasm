import { MainModule } from "public/occt-wasm";

declare global {
    interface Window {
      wasm: MainModule;
    }
  }
  