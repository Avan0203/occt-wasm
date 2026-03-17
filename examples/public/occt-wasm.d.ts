// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
interface WasmModule {
}

type EmbindString = ArrayBuffer|Uint8Array|Uint8ClampedArray|Int8Array|string;
export interface ClassHandle {
  isAliasOf(other: ClassHandle): boolean;
  delete(): void;
  deleteLater(): this;
  isDeleted(): boolean;
  // @ts-ignore - If targeting lower than ESNext, this symbol might not exist.
  [Symbol.dispose](): void;
  clone(): this;
}
export interface FloatVector extends ClassHandle {
  push_back(_0: number): void;
  resize(_0: number, _1: number): void;
  size(): number;
  get(_0: number): number | undefined;
  set(_0: number, _1: number): boolean;
}

export interface Uint32Vector extends ClassHandle {
  push_back(_0: number): void;
  resize(_0: number, _1: number): void;
  size(): number;
  get(_0: number): number | undefined;
  set(_0: number, _1: number): boolean;
}

export interface Vertex extends ClassHandle {
}

export interface Edge extends ClassHandle {
}

export interface Wire extends ClassHandle {
}

export interface Face extends ClassHandle {
}

export interface Shell extends ClassHandle {
}

export interface Solid extends ClassHandle {
}

export interface Compound extends ClassHandle {
}

export interface Shape extends ClassHandle {
}

export interface gp_Pnt extends ClassHandle {
  x(): number;
  y(): number;
  z(): number;
  setX(_0: number): void;
  setY(_0: number): void;
  setZ(_0: number): void;
  setCoord(_0: number, _1: number, _2: number): void;
  coord(_0: number): number;
  distance(_0: gp_Pnt): number;
  squareDistance(_0: gp_Pnt): number;
  isEqual(_0: gp_Pnt, _1: number): boolean;
  setXYZ(_0: gp_XYZ): void;
  transform(_0: gp_Trsf): void;
  transformed(_0: gp_Trsf): gp_Pnt;
}

export interface gp_Vec extends ClassHandle {
  x(): number;
  y(): number;
  z(): number;
  setX(_0: number): void;
  setY(_0: number): void;
  setZ(_0: number): void;
  setCoord(_0: number, _1: number, _2: number): void;
  coord(_0: number): number;
  magnitude(): number;
  squareMagnitude(): number;
  normalize(): void;
  normalized(): gp_Vec;
  reverse(): void;
  reversed(): gp_Vec;
  scale(_0: number): void;
  scaled(_0: number): gp_Vec;
  add(_0: gp_Vec): gp_Vec;
  subtract(_0: gp_Vec): gp_Vec;
  multiply(_0: number): gp_Vec;
  dot(_0: gp_Vec): number;
  cross(_0: gp_Vec): gp_Vec;
  crossMagnitude(_0: gp_Vec): number;
  crossSquareMagnitude(_0: gp_Vec): number;
  setXYZ(_0: gp_XYZ): void;
  transform(_0: gp_Trsf): void;
  transformed(_0: gp_Trsf): gp_Vec;
}

export interface gp_XYZ extends ClassHandle {
  x(): number;
  y(): number;
  z(): number;
  setX(_0: number): void;
  setY(_0: number): void;
  setZ(_0: number): void;
  setCoord(_0: number, _1: number, _2: number): void;
  coord(_0: number): number;
  modulus(): number;
  squareModulus(): number;
  normalize(): void;
  normalized(): gp_XYZ;
  reverse(): void;
  reversed(): gp_XYZ;
  add(_0: gp_XYZ): void;
  subtract(_0: gp_XYZ): void;
  multiply(_0: number): void;
  divide(_0: number): void;
  cross(_0: gp_XYZ): void;
  dot(_0: gp_XYZ): number;
}

export interface gp_Trsf extends ClassHandle {
  setTranslation(_0: gp_Vec): void;
  setScale(_0: number): void;
  setMirror(_0: gp_Pnt): void;
  translationPart(): gp_XYZ;
  scaleFactor(): number;
  isNegative(): boolean;
  multiply(_0: gp_Trsf): void;
  multiplied(_0: gp_Trsf): gp_Trsf;
  invert(): void;
  inverted(): gp_Trsf;
  power(_0: number): void;
  powered(_0: number): gp_Trsf;
  setFromMatrix4(_0: any): void;
  toMatrix4(): any;
  setRotation(_0: gp_Ax1, _1: number): void;
  setMirrorAxis(_0: gp_Ax1): void;
  setMirrorPlane(_0: gp_Ax2): void;
  setTransformation(_0: gp_Ax3, _1: gp_Ax3): void;
  vectorialPart(): gp_Mat;
  form(): gp_TrsfForm;
}

export interface gp_Ax1 extends ClassHandle {
  location(): gp_Pnt;
  setLocation(_0: gp_Pnt): void;
  reverse(): void;
  reversed(): gp_Ax1;
  transform(_0: gp_Trsf): void;
  transformed(_0: gp_Trsf): gp_Ax1;
  direction(): gp_Dir;
  setDirection(_0: gp_Dir): void;
}

export interface gp_Ax2 extends ClassHandle {
  location(): gp_Pnt;
  setLocation(_0: gp_Pnt): void;
  transform(_0: gp_Trsf): void;
  transformed(_0: gp_Trsf): gp_Ax2;
  direction(): gp_Dir;
  xDirection(): gp_Dir;
  yDirection(): gp_Dir;
  setDirection(_0: gp_Dir): void;
  setXDirection(_0: gp_Dir): void;
  setYDirection(_0: gp_Dir): void;
}

export interface gp_Ax3 extends ClassHandle {
  location(): gp_Pnt;
  setLocation(_0: gp_Pnt): void;
  transform(_0: gp_Trsf): void;
  transformed(_0: gp_Trsf): gp_Ax3;
  direction(): gp_Dir;
  xDirection(): gp_Dir;
  yDirection(): gp_Dir;
  setDirection(_0: gp_Dir): void;
  setXDirection(_0: gp_Dir): void;
  setYDirection(_0: gp_Dir): void;
}

export interface gp_Quaternion extends ClassHandle {
  set(_0: number, _1: number, _2: number, _3: number): void;
  set(_0: gp_Quaternion): void;
  x(): number;
  y(): number;
  z(): number;
  w(): number;
  setIdent(): void;
  isEqual(_0: gp_Quaternion): boolean;
  setRotation(_0: gp_Vec, _1: gp_Vec): void;
  setRotationWithHelp(_0: gp_Vec, _1: gp_Vec, _2: gp_Vec): void;
  setVectorAndAngle(_0: gp_Vec, _1: number): void;
  getVectorAndAngle(): any;
  normalize(): void;
  normalized(): gp_Quaternion;
  stabilizeLength(): void;
  reverse(): void;
  reversed(): gp_Quaternion;
  invert(): void;
  inverted(): gp_Quaternion;
  norm(): number;
  squareNorm(): number;
  scale(_0: number): void;
  scaled(_0: number): gp_Quaternion;
  add(_0: gp_Quaternion): void;
  added(_0: gp_Quaternion): gp_Quaternion;
  subtract(_0: gp_Quaternion): void;
  subtracted(_0: gp_Quaternion): gp_Quaternion;
  multiply(_0: gp_Quaternion): void;
  multiplied(_0: gp_Quaternion): gp_Quaternion;
  multiplyVector(_0: gp_Vec): gp_Vec;
  dot(_0: gp_Quaternion): number;
  getRotationAngle(): number;
  negated(): gp_Quaternion;
  setMatrix(_0: gp_Mat): void;
  getMatrix(): gp_Mat;
  setEulerAngles(_0: gp_EulerSequence, _1: number, _2: number, _3: number): void;
  getEulerAngles(_0: gp_EulerSequence): any;
}

export interface gp_Mat extends ClassHandle {
  setValue(_0: number, _1: number, _2: number): void;
  value(_0: number, _1: number): number;
  row(_0: number): gp_XYZ;
  column(_0: number): gp_XYZ;
  setRow(_0: number, _1: gp_XYZ): void;
  determinant(): number;
  invert(): void;
  inverted(): gp_Mat;
  multiply(_0: gp_Mat): void;
  multiplied(_0: gp_Mat): gp_Mat;
  add(_0: gp_Mat): void;
  added(_0: gp_Mat): gp_Mat;
  subtract(_0: gp_Mat): void;
  subtracted(_0: gp_Mat): gp_Mat;
  transpose(): void;
  transposed(): gp_Mat;
  setCol(_0: number, _1: gp_XYZ): void;
}

export interface gp_Dir extends ClassHandle {
  x(): number;
  y(): number;
  z(): number;
  setX(_0: number): void;
  setY(_0: number): void;
  setZ(_0: number): void;
  reverse(): void;
  reversed(): gp_Dir;
  transform(_0: gp_Trsf): void;
  transformed(_0: gp_Trsf): gp_Dir;
}

export interface gp_Lin extends ClassHandle {
  location(): gp_Pnt;
  direction(): gp_Dir;
  setLocation(_0: gp_Pnt): void;
  setDirection(_0: gp_Dir): void;
  reverse(): void;
  reversed(): gp_Lin;
  transform(_0: gp_Trsf): void;
  transformed(_0: gp_Trsf): gp_Lin;
}

export interface gp_Circ extends ClassHandle {
  location(): gp_Pnt;
  axis(): gp_Ax1;
  xAxis(): gp_Ax1;
  yAxis(): gp_Ax1;
  position(): gp_Ax2;
  radius(): number;
  setAxis(_0: gp_Ax1): void;
  setLocation(_0: gp_Pnt): void;
  setPosition(_0: gp_Ax2): void;
  setRadius(_0: number): void;
  transform(_0: gp_Trsf): void;
  transformed(_0: gp_Trsf): gp_Circ;
}

export interface gp_Pln extends ClassHandle {
  location(): gp_Pnt;
  axis(): gp_Ax1;
  xAxis(): gp_Ax1;
  yAxis(): gp_Ax1;
  position(): gp_Ax3;
  setAxis(_0: gp_Ax1): void;
  setLocation(_0: gp_Pnt): void;
  setPosition(_0: gp_Ax3): void;
  transform(_0: gp_Trsf): void;
  transformed(_0: gp_Trsf): gp_Pln;
}

export interface TopLoc_Location extends ClassHandle {
  isIdentity(): boolean;
  identity(): void;
  transformation(): gp_Trsf;
  inverted(): TopLoc_Location;
  multiplied(_0: TopLoc_Location): TopLoc_Location;
  divided(_0: TopLoc_Location): TopLoc_Location;
  predivided(_0: TopLoc_Location): TopLoc_Location;
  powered(_0: number): TopLoc_Location;
  isEqual(_0: TopLoc_Location): boolean;
  isDifferent(_0: TopLoc_Location): boolean;
  clear(): void;
}

export interface TopoDS_Iterator extends ClassHandle {
  more(): boolean;
  next(): void;
  initialize(_0: TopoDS_Shape, _1: boolean, _2: boolean): void;
  value(): TopoDS_Shape;
}

export interface TopoDS_Shape extends ClassHandle {
  isNull(): boolean;
  nullify(): void;
  shapeTypeString(): string;
  location(): TopLoc_Location;
  setLocation(_0: TopLoc_Location): void;
  located(_0: TopLoc_Location): TopoDS_Shape;
  moved(_0: TopLoc_Location): TopoDS_Shape;
  setLocationFromMatrix4(_0: any): void;
  reverse(): void;
  reversed(): TopoDS_Shape;
  isPartner(_0: TopoDS_Shape): boolean;
  isSame(_0: TopoDS_Shape): boolean;
  isEqual(_0: TopoDS_Shape): boolean;
  isNotEqual(_0: TopoDS_Shape): boolean;
  nbChildren(): number;
  children(): any;
  shapeType(): TopAbs_ShapeEnum;
  orientation(): TopAbs_Orientation;
  setOrientation(_0: TopAbs_Orientation): void;
  oriented(_0: TopAbs_Orientation): TopoDS_Shape;
}

export interface TopoDS_Face extends TopoDS_Shape {
}

export interface TopoDS_Edge extends TopoDS_Shape {
  getCurveType(): GeomAbs_CurveType;
}

export interface TopoDS_Vertex extends TopoDS_Shape {
}

export interface TopoDS_Wire extends TopoDS_Shape {
}

export interface TopoDS_Shell extends TopoDS_Shape {
}

export interface TopoDS_Solid extends TopoDS_Shape {
}

export interface TopoDS_Compound extends TopoDS_Shape {
}

export interface CurveFactory extends ClassHandle {
}

export interface GeometryFactory extends ClassHandle {
}

export interface Modeler extends ClassHandle {
}

export interface ShapeNode extends ClassHandle {
  shape: TopoDS_Shape | undefined;
  get name(): string;
  set name(value: EmbindString);
  get color(): string | undefined;
  set color(value: EmbindString | undefined);
  getChildren(): Array<ShapeNode>;
}

export interface Exchange extends ClassHandle {
}

export type Vector3 = {
  x: number,
  y: number,
  z: number
};

export type Axis1 = {
  origin: Vector3,
  direction: Vector3
};

export type Axis2 = {
  origin: Vector3,
  xDirection: Vector3,
  yDirection: Vector3
};

export type Plane = {
  origin: Vector3,
  normal: Vector3
};

export type Axis3 = {
  origin: Vector3,
  xDirection: Vector3,
  yDirection: Vector3,
  zDirection: Vector3
};

export type BoundingBox3 = {
  min: Vector3,
  max: Vector3
};

export interface TopoResult extends ClassHandle {
  shape: TopoDS_Shape;
  status: boolean;
  get message(): string;
  set message(value: EmbindString);
  takeShape(): TopoDS_Shape;
}

export interface GeomAbs_ShapeValue<T extends number> {
  value: T;
}
export type GeomAbs_Shape = GeomAbs_ShapeValue<0>|GeomAbs_ShapeValue<1>|GeomAbs_ShapeValue<2>|GeomAbs_ShapeValue<3>|GeomAbs_ShapeValue<4>|GeomAbs_ShapeValue<5>|GeomAbs_ShapeValue<6>;

export interface TopAbs_ShapeEnumValue<T extends number> {
  value: T;
}
export type TopAbs_ShapeEnum = TopAbs_ShapeEnumValue<0>|TopAbs_ShapeEnumValue<1>|TopAbs_ShapeEnumValue<2>|TopAbs_ShapeEnumValue<3>|TopAbs_ShapeEnumValue<4>|TopAbs_ShapeEnumValue<5>|TopAbs_ShapeEnumValue<6>|TopAbs_ShapeEnumValue<7>;

export interface TopAbs_OrientationValue<T extends number> {
  value: T;
}
export type TopAbs_Orientation = TopAbs_OrientationValue<0>|TopAbs_OrientationValue<1>|TopAbs_OrientationValue<2>|TopAbs_OrientationValue<3>;

export interface GeomAbs_CurveTypeValue<T extends number> {
  value: T;
}
export type GeomAbs_CurveType = GeomAbs_CurveTypeValue<0>|GeomAbs_CurveTypeValue<1>|GeomAbs_CurveTypeValue<2>|GeomAbs_CurveTypeValue<3>|GeomAbs_CurveTypeValue<4>|GeomAbs_CurveTypeValue<5>|GeomAbs_CurveTypeValue<6>|GeomAbs_CurveTypeValue<7>|GeomAbs_CurveTypeValue<8>;

export interface BRepBuilderAPI_ShellErrorValue<T extends number> {
  value: T;
}
export type BRepBuilderAPI_ShellError = BRepBuilderAPI_ShellErrorValue<0>|BRepBuilderAPI_ShellErrorValue<1>|BRepBuilderAPI_ShellErrorValue<2>|BRepBuilderAPI_ShellErrorValue<3>;

export interface gp_TrsfFormValue<T extends number> {
  value: T;
}
export type gp_TrsfForm = gp_TrsfFormValue<0>|gp_TrsfFormValue<1>|gp_TrsfFormValue<2>|gp_TrsfFormValue<3>|gp_TrsfFormValue<4>|gp_TrsfFormValue<5>|gp_TrsfFormValue<6>|gp_TrsfFormValue<7>|gp_TrsfFormValue<8>;

export interface gp_EulerSequenceValue<T extends number> {
  value: T;
}
export type gp_EulerSequence = gp_EulerSequenceValue<0>|gp_EulerSequenceValue<1>|gp_EulerSequenceValue<2>|gp_EulerSequenceValue<3>|gp_EulerSequenceValue<4>|gp_EulerSequenceValue<5>|gp_EulerSequenceValue<6>|gp_EulerSequenceValue<7>|gp_EulerSequenceValue<8>|gp_EulerSequenceValue<9>|gp_EulerSequenceValue<10>|gp_EulerSequenceValue<11>|gp_EulerSequenceValue<12>|gp_EulerSequenceValue<13>|gp_EulerSequenceValue<14>|gp_EulerSequenceValue<15>|gp_EulerSequenceValue<16>|gp_EulerSequenceValue<17>|gp_EulerSequenceValue<19>|gp_EulerSequenceValue<18>|gp_EulerSequenceValue<20>|gp_EulerSequenceValue<21>|gp_EulerSequenceValue<22>|gp_EulerSequenceValue<23>|gp_EulerSequenceValue<24>|gp_EulerSequenceValue<25>;

interface EmbindModule {
  FloatVector: {
    new(): FloatVector;
  };
  Uint32Vector: {
    new(): Uint32Vector;
  };
  Vertex: {
    toVector3(_0: TopoDS_Vertex): Vector3;
    fromPoint(_0: Vector3): TopoDS_Vertex;
  };
  Edge: {
    getLength(_0: TopoDS_Edge): number;
    isIntersect(_0: TopoDS_Edge, _1: TopoDS_Edge, _2: any): boolean;
    trim(_0: TopoDS_Edge, _1: number, _2: number): TopoDS_Edge;
    discretize(_0: TopoDS_Edge, _1: any, _2: any): any;
    intersections(_0: TopoDS_Edge, _1: TopoDS_Edge, _2: any): Array<Vector3>;
    fromPoints(_0: Vector3, _1: Vector3): TopoDS_Edge;
    pointAt(_0: TopoDS_Edge, _1: number): Vector3;
  };
  Wire: {
    close(_0: TopoDS_Wire): TopoDS_Wire;
    makeFace(_0: TopoDS_Wire): TopoDS_Face;
    fromVertices(_0: Array<Vector3>): TopoDS_Wire;
    fromEdges(_0: Array<TopoDS_Edge>): TopoDS_Wire;
  };
  Face: {
    area(_0: TopoDS_Face): number;
    triangulate(_0: TopoDS_Face, _1: number, _2: number): any;
    fromVertices(_0: Array<Vector3>, _1: Array<Array<Vector3>>): TopoDS_Face;
  };
  Shell: {
    fromFaces(_0: Array<TopoDS_Face>): TopoDS_Shell;
  };
  Solid: {
    volume(_0: TopoDS_Solid): number;
    fromFaces(_0: Array<TopoDS_Face>): TopoDS_Solid;
  };
  Compound: {
    fromShapes(_0: Array<TopoDS_Shape>): TopoDS_Compound;
  };
  Shape: {
    isClosed(_0: TopoDS_Shape): boolean;
    getVertices(_0: TopoDS_Shape): any;
    getEdges(_0: TopoDS_Shape): any;
    getFaces(_0: TopoDS_Shape): any;
    getWires(_0: TopoDS_Shape): any;
    getSolids(_0: TopoDS_Shape): any;
    getCompounds(_0: TopoDS_Shape): any;
    toBRepResult(_0: TopoDS_Shape, _1: number, _2: number): any;
    removeSubShapes(_0: TopoDS_Shape, _1: Array<TopoDS_Shape>): TopoDS_Shape;
    getBoundingBox(_0: TopoDS_Shape): BoundingBox3;
    getSubShape(_0: TopoDS_Shape, _1: number, _2: TopAbs_ShapeEnum): TopoDS_Shape;
  };
  gp_Pnt: {
    new(): gp_Pnt;
    new(_0: number, _1: number, _2: number): gp_Pnt;
    new(_0: gp_XYZ): gp_Pnt;
  };
  gp_Vec: {
    new(): gp_Vec;
    new(_0: number, _1: number, _2: number): gp_Vec;
  };
  gp_XYZ: {
    new(): gp_XYZ;
    new(_0: number, _1: number, _2: number): gp_XYZ;
  };
  gp_Trsf: {
    new(): gp_Trsf;
  };
  gp_Ax1: {
    new(): gp_Ax1;
    new(_0: gp_Pnt, _1: gp_Dir): gp_Ax1;
  };
  gp_Ax2: {
    new(): gp_Ax2;
    new(_0: gp_Pnt, _1: gp_Dir): gp_Ax2;
    new(_0: gp_Pnt, _1: gp_Dir, _2: gp_Dir): gp_Ax2;
  };
  gp_Ax3: {
    new(): gp_Ax3;
    new(_0: gp_Ax2): gp_Ax3;
    new(_0: gp_Pnt, _1: gp_Dir): gp_Ax3;
    new(_0: gp_Pnt, _1: gp_Dir, _2: gp_Dir): gp_Ax3;
  };
  gp_Quaternion: {
    new(): gp_Quaternion;
    new(_0: number, _1: number, _2: number, _3: number): gp_Quaternion;
    new(_0: gp_Vec, _1: gp_Vec): gp_Quaternion;
    new(_0: gp_Vec, _1: gp_Vec, _2: gp_Vec): gp_Quaternion;
    new(_0: gp_Mat): gp_Quaternion;
  };
  gp_Mat: {
    new(): gp_Mat;
    new(_0: gp_XYZ, _1: gp_XYZ, _2: gp_XYZ): gp_Mat;
  };
  gp_Dir: {
    new(): gp_Dir;
    new(_0: number, _1: number, _2: number): gp_Dir;
    new(_0: gp_XYZ): gp_Dir;
  };
  gp_Lin: {
    new(): gp_Lin;
    new(_0: gp_Ax1): gp_Lin;
    new(_0: gp_Pnt, _1: gp_Dir): gp_Lin;
  };
  gp_Circ: {
    new(): gp_Circ;
    new(_0: gp_Ax2, _1: number): gp_Circ;
  };
  gp_Pln: {
    new(): gp_Pln;
    new(_0: gp_Ax3): gp_Pln;
    new(_0: gp_Pnt, _1: gp_Dir): gp_Pln;
  };
  TopLoc_Location: {
    new(): TopLoc_Location;
    new(_0: TopLoc_Location): TopLoc_Location;
    createWithTrsf(_0: gp_Trsf): TopLoc_Location;
  };
  TopoDS_Iterator: {
    new(): TopoDS_Iterator;
    new(_0: TopoDS_Shape): TopoDS_Iterator;
    new(_0: TopoDS_Shape, _1: boolean, _2: boolean): TopoDS_Iterator;
  };
  TopoDS_Shape: {
    new(): TopoDS_Shape;
    new(_0: TopoDS_Shape): TopoDS_Shape;
  };
  TopoDS_Face: {
    new(): TopoDS_Face;
    new(_0: TopoDS_Face): TopoDS_Face;
  };
  TopoDS_Edge: {
    new(): TopoDS_Edge;
    new(_0: TopoDS_Edge): TopoDS_Edge;
  };
  TopoDS_Vertex: {
    new(): TopoDS_Vertex;
    new(_0: TopoDS_Vertex): TopoDS_Vertex;
  };
  TopoDS_Wire: {
    new(): TopoDS_Wire;
    new(_0: TopoDS_Wire): TopoDS_Wire;
  };
  TopoDS_Shell: {
    new(): TopoDS_Shell;
    new(_0: TopoDS_Shell): TopoDS_Shell;
  };
  TopoDS_Solid: {
    new(): TopoDS_Solid;
    new(_0: TopoDS_Solid): TopoDS_Solid;
  };
  TopoDS_Compound: {
    new(): TopoDS_Compound;
    new(_0: TopoDS_Compound): TopoDS_Compound;
  };
  CurveFactory: {
    BSpline(_0: Array<Vector3>, _1: Array<number>, _2: Array<number>, _3: number, _4: boolean, _5?: Array<number>): TopoDS_Edge;
    Line(_0: Vector3, _1: Vector3): TopoDS_Edge;
    Circle(_0: Vector3, _1: number, _2: number, _3: number, _4: boolean, _5: Vector3): TopoDS_Edge;
    Ellipse(_0: Vector3, _1: number, _2: number, _3: Vector3): TopoDS_Edge;
  };
  GeometryFactory: {
    Box(_0: number, _1: number, _2: number, _3: Axis2): TopoResult;
    Sphere(_0: number, _1: Axis2): TopoResult;
    Cylinder(_0: number, _1: number, _2: Axis2): TopoResult;
    Cone(_0: number, _1: number, _2: number, _3: Axis2): TopoResult;
    Torus(_0: number, _1: number, _2: Axis2): TopoResult;
  };
  Modeler: {
    fillet(_0: TopoDS_Shape, _1: Array<TopoDS_Edge>, _2: number): TopoResult;
    chamfer(_0: TopoDS_Shape, _1: Array<TopoDS_Edge>, _2: number): TopoResult;
    prism(_0: TopoDS_Shape, _1: Vector3): TopoResult;
    union(_0: Array<TopoDS_Shape>, _1: Array<TopoDS_Shape>, _2: number): TopoResult;
    difference(_0: Array<TopoDS_Shape>, _1: Array<TopoDS_Shape>, _2: number): TopoResult;
    intersection(_0: Array<TopoDS_Shape>, _1: Array<TopoDS_Shape>, _2: number): TopoResult;
    revolve(_0: TopoDS_Shape, _1: Axis1, _2: number): TopoResult;
    sweep(_0: Array<TopoDS_Wire>, _1: TopoDS_Wire, _2: boolean, _3: boolean, _4: boolean): TopoResult;
    thickSolid(_0: TopoDS_Shape, _1: Array<TopoDS_Shape>, _2: number, _3: number): TopoResult;
    simplify(_0: TopoDS_Shape, _1: boolean, _2: boolean): TopoResult;
    loft(_0: Array<TopoDS_Shape>, _1: boolean, _2: GeomAbs_Shape, _3: boolean, _4: number): TopoResult;
  };
  ShapeNode: {};
  Exchange: {
    exportSTEP(_0: ShapeNode): any;
    exportIGES(_0: ShapeNode): any;
    importSTEP(_0: Uint8Array): ShapeNode | undefined;
    importIGES(_0: Uint8Array): ShapeNode | undefined;
    importSTL(_0: Uint8Array): ShapeNode | undefined;
    importBREP(_0: Uint8Array): TopoDS_Shape;
    exportSTL(_0: Array<TopoDS_Shape>, _1: number, _2: number): any;
    exportBREP(_0: Array<TopoDS_Shape>): any;
  };
  TopoResult: {};
  GeomAbs_Shape: {GeomAbs_C0: GeomAbs_ShapeValue<0>, GeomAbs_G1: GeomAbs_ShapeValue<1>, GeomAbs_C1: GeomAbs_ShapeValue<2>, GeomAbs_G2: GeomAbs_ShapeValue<3>, GeomAbs_C2: GeomAbs_ShapeValue<4>, GeomAbs_C3: GeomAbs_ShapeValue<5>, GeomAbs_CN: GeomAbs_ShapeValue<6>};
  TopAbs_ShapeEnum: {TopAbs_COMPOUND: TopAbs_ShapeEnumValue<0>, TopAbs_COMPSOLID: TopAbs_ShapeEnumValue<1>, TopAbs_SOLID: TopAbs_ShapeEnumValue<2>, TopAbs_SHELL: TopAbs_ShapeEnumValue<3>, TopAbs_FACE: TopAbs_ShapeEnumValue<4>, TopAbs_WIRE: TopAbs_ShapeEnumValue<5>, TopAbs_EDGE: TopAbs_ShapeEnumValue<6>, TopAbs_VERTEX: TopAbs_ShapeEnumValue<7>};
  TopAbs_Orientation: {TopAbs_FORWARD: TopAbs_OrientationValue<0>, TopAbs_REVERSED: TopAbs_OrientationValue<1>, TopAbs_INTERNAL: TopAbs_OrientationValue<2>, TopAbs_EXTERNAL: TopAbs_OrientationValue<3>};
  GeomAbs_CurveType: {GeomAbs_Line: GeomAbs_CurveTypeValue<0>, GeomAbs_Circle: GeomAbs_CurveTypeValue<1>, GeomAbs_Ellipse: GeomAbs_CurveTypeValue<2>, GeomAbs_Hyperbola: GeomAbs_CurveTypeValue<3>, GeomAbs_Parabola: GeomAbs_CurveTypeValue<4>, GeomAbs_BezierCurve: GeomAbs_CurveTypeValue<5>, GeomAbs_BSplineCurve: GeomAbs_CurveTypeValue<6>, GeomAbs_OffsetCurve: GeomAbs_CurveTypeValue<7>, GeomAbs_OtherCurve: GeomAbs_CurveTypeValue<8>};
  BRepBuilderAPI_ShellError: {ShellDone: BRepBuilderAPI_ShellErrorValue<0>, EmptyShell: BRepBuilderAPI_ShellErrorValue<1>, DisconnectedShell: BRepBuilderAPI_ShellErrorValue<2>, ShellParametersOutOfRange: BRepBuilderAPI_ShellErrorValue<3>};
  gp_TrsfForm: {gp_Identity: gp_TrsfFormValue<0>, gp_Rotation: gp_TrsfFormValue<1>, gp_Translation: gp_TrsfFormValue<2>, gp_PntMirror: gp_TrsfFormValue<3>, gp_Ax1Mirror: gp_TrsfFormValue<4>, gp_Ax2Mirror: gp_TrsfFormValue<5>, gp_Scale: gp_TrsfFormValue<6>, gp_CompoundTrsf: gp_TrsfFormValue<7>, gp_Other: gp_TrsfFormValue<8>};
  gp_EulerSequence: {gp_EulerAngles: gp_EulerSequenceValue<0>, gp_YawPitchRoll: gp_EulerSequenceValue<1>, gp_Extrinsic_XYZ: gp_EulerSequenceValue<2>, gp_Extrinsic_XZY: gp_EulerSequenceValue<3>, gp_Extrinsic_YZX: gp_EulerSequenceValue<4>, gp_Extrinsic_YXZ: gp_EulerSequenceValue<5>, gp_Extrinsic_ZXY: gp_EulerSequenceValue<6>, gp_Extrinsic_ZYX: gp_EulerSequenceValue<7>, gp_Intrinsic_XYZ: gp_EulerSequenceValue<8>, gp_Intrinsic_XZY: gp_EulerSequenceValue<9>, gp_Intrinsic_YZX: gp_EulerSequenceValue<10>, gp_Intrinsic_YXZ: gp_EulerSequenceValue<11>, gp_Intrinsic_ZXY: gp_EulerSequenceValue<12>, gp_Intrinsic_ZYX: gp_EulerSequenceValue<13>, gp_Extrinsic_XYX: gp_EulerSequenceValue<14>, gp_Extrinsic_XZX: gp_EulerSequenceValue<15>, gp_Extrinsic_YZY: gp_EulerSequenceValue<16>, gp_Extrinsic_YXY: gp_EulerSequenceValue<17>, gp_Extrinsic_ZXZ: gp_EulerSequenceValue<19>, gp_Extrinsic_ZYZ: gp_EulerSequenceValue<18>, gp_Intrinsic_XYX: gp_EulerSequenceValue<20>, gp_Intrinsic_XZX: gp_EulerSequenceValue<21>, gp_Intrinsic_YZY: gp_EulerSequenceValue<22>, gp_Intrinsic_YXY: gp_EulerSequenceValue<23>, gp_Intrinsic_ZXZ: gp_EulerSequenceValue<24>, gp_Intrinsic_ZYZ: gp_EulerSequenceValue<25>};
}

export type MainModule = WasmModule & EmbindModule;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
