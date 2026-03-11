import { SketchBuilder } from './sketch';
import fontJSON from 'public/font.json';
import { Vector3 } from './vector3';
import { Compound, Wire } from './shape';
import { TopoDS_Compound, TopoDS_Edge, TopoDS_Shape, TopoDS_Wire } from 'public/occt-wasm';

/** ============================== 字体 ============================== */

export interface IFontLetter {
    ha: number;
    x_min: number;
    x_max: number; 
    o: string;
    fillRule: 'evenodd' | 'nonzero';
}

export interface IFontLibraryWithGlyphs {
    familyName: string;
    resolution: number;
    underlineThickness: number;
    boundingBox: {
        yMin: number;
        xMin: number;
        yMax: number;
        xMax: number;
    };
    glyphs: {
        [key in string]: IFontLetter;
    };
}


class FontsBuilder {
    private fontLib: IFontLibraryWithGlyphs;
    private sketchBuilder: SketchBuilder;
    private constructor() {
        const fontLib = fontJSON as IFontLibraryWithGlyphs;
        this.fontLib = fontLib;
        this.sketchBuilder = SketchBuilder.getInstance();
    }

    private static instance: FontsBuilder;

    public static getInstance(): FontsBuilder {
        if (!FontsBuilder.instance) {
            FontsBuilder.instance = new FontsBuilder();
        }
        return FontsBuilder.instance;
    }

    public createFonts(text: string, size: number): Fonts {
        const fonts: Font[] = [];
        this.createLetterCurves(text, size, fonts);
        return new Fonts(size, fonts);
    }

    private createLetterCurves(text: string, size: number, fonts: Font[]) {
        const chars = Array.from(text);
        const scale = size / this.fontLib.resolution;
        const line_height = (this.fontLib.boundingBox.yMax - this.fontLib.boundingBox.yMin + this.fontLib.underlineThickness) * scale;


        let offsetX = 0;
        let offsetY = 0;

        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];

            if (char === '\n') {
                offsetX = 0;
                offsetY -= line_height;
            } else {
                const ret = this.createLetterCurve(char, scale, offsetX, offsetY, fonts);
                if (ret) {
                    offsetX += ret.offsetX;
                }
            }
        }
    }

    private createLetterCurve(
        char: string,
        scale: number,
        offsetX: number,
        offsetY: number,
        fonts: Font[],
    ): { offsetX: number } | undefined {
        const glyph = this.fontLib.glyphs[char] || this.fontLib.glyphs['?'];
        if (!glyph) {
            console.error(`Font: character "${char}" does not exist in font family ${this.fontLib.familyName}.`);
            return undefined;
        }

        if (glyph.o) {
            const outline = glyph.o.trim().split(/\s+/);
            const wires = this.drawFontCurve(outline, scale, offsetX, offsetY);
            fonts.push(new Font(char, scale, wires));
        }

        return { offsetX: glyph.ha * scale };
    }

    private drawFontCurve(outline: string[], scale: number, offsetX: number, offsetY: number): TopoDS_Wire[] {
        const allWires: TopoDS_Wire[] = [];
        let [x, y, cpx, cpy, cpx1, cpy1, cpx2, cpy2] = [0, 0, 0, 0, 0, 0, 0, 0];
        const Y_NORMAL = new Vector3(0, 1, 0);
        let firstM = true;

        const pushContourAsWire = (): void => {
            if (this.sketchBuilder.getCurves().length === 0) return;
            this.sketchBuilder.closePath();
            const sketch = this.sketchBuilder.build();
            const edges = sketch.getShapes();
            if (edges.length > 0) {
                allWires.push(Wire.fromEdges(edges as TopoDS_Edge[]));
                sketch.dispose(); // 合并成 wire 后释放 curve 持有的 edge，避免内存泄漏
            }
        };

        for (let i = 0, l = outline.length; i < l; ) {
            const action = outline[i++];

            switch (action) {
                case 'm': // moveTo - 新 contour
                    if (!firstM) {
                        pushContourAsWire();
                    }
                    this.sketchBuilder.beginPath(Y_NORMAL);
                    x = Number(outline[i++]) * scale + offsetX;
                    y = Number(outline[i++]) * scale + offsetY;
                    this.sketchBuilder.moveTo(new Vector3(x, y, 0));
                    firstM = false;
                    break;
                case 'l': // lineTo
                    x = Number(outline[i++]) * scale + offsetX;
                    y = Number(outline[i++]) * scale + offsetY;
                    this.sketchBuilder.lineTo(new Vector3(x, y, 0));
                    break;
                case 'q': // quadraticCurveTo - facetype/typeface 格式: q endX endY controlX controlY（与 SVG 相反）
                    cpx = Number(outline[i++]) * scale + offsetX;
                    cpy = Number(outline[i++]) * scale + offsetY;
                    cpx1 = Number(outline[i++]) * scale + offsetX;
                    cpy1 = Number(outline[i++]) * scale + offsetY;
                    this.sketchBuilder.quadraticCurveTo(new Vector3(cpx1, cpy1, 0), new Vector3(cpx, cpy, 0));
                    break;
                case 'c': // Cubic Bezier
                    cpx1 = Number(outline[i++]) * scale + offsetX;
                    cpy1 = Number(outline[i++]) * scale + offsetY;
                    cpx2 = Number(outline[i++]) * scale + offsetX;
                    cpy2 = Number(outline[i++]) * scale + offsetY;
                    x = Number(outline[i++]) * scale + offsetX;
                    y = Number(outline[i++]) * scale + offsetY;
                    this.sketchBuilder.bezierCurveTo(new Vector3(cpx1, cpy1, 0), new Vector3(cpx2, cpy2, 0), new Vector3(x, y, 0));
                    break;
                case 'z': // closePath
                    pushContourAsWire();
                    this.sketchBuilder.beginPath(Y_NORMAL); // 准备下一 contour
                    break;
            }
        }

        // 兜底处理，如果还有曲线，则关闭路径并添加到 wire 列表，防止没有触发 Z
        pushContourAsWire();
        return allWires;
    }
}

class Fonts {
    size: number = 0;
    private fontMap: Map<string, Font> = new Map();
    private compound: TopoDS_Compound | null = null;

    constructor(size: number, private fonts: Font[]) {
        this.size = size;
        for (const font of fonts) {
            this.fontMap.set(font.char, font);
        }
    }

    getFont(char: string): Font | undefined {
        return this.fontMap.get(char);
    }

    getShape(): TopoDS_Compound {
        if (!this.compound) {
            const shapes = this.fonts.flatMap((f) => f.getShapes());
            this.compound = Compound.fromShapes(shapes);
        }
        return this.compound;
    }
}

class Font {
    char: string = '';
    size: number = 0;
    private wires: TopoDS_Wire[] = [];
    private compound: TopoDS_Compound | null = null;

    constructor(char: string, size: number, wires: TopoDS_Wire[]) {
        this.char = char;
        this.size = size;
        this.wires = wires;
    }

    getShapes(): TopoDS_Shape[] {
        return this.wires;
    }

    getShape(): TopoDS_Compound {
        if (!this.compound) {
            this.compound = Compound.fromShapes(this.wires);
        }
        return this.compound;
    }
}

export { FontsBuilder, Fonts, Font };
