#include "ExchangeBindings.h"
#include "brep/ShapeBindings.h"
#include "shared/Shared.hpp"

#include <BRep_Builder.hxx>
#include <BRepTools.hxx>
#include <Quantity_Color.hxx>
#include <STEPCAFControl_Reader.hxx>
#include <STEPCAFControl_Writer.hxx>
#include <STEPControl_StepModelType.hxx>
#include <IGESCAFControl_Reader.hxx>
#include <IGESCAFControl_Writer.hxx>
#include <StlAPI_Reader.hxx>
#include <StlAPI_Writer.hxx>
#include <BRepMesh_IncrementalMesh.hxx>
#include <TDF_ChildIterator.hxx>
#include <TDF_Label.hxx>
#include <TDataStd_Name.hxx>
#include <TDocStd_Document.hxx>
#include <TopoDS_Iterator.hxx>
#include <TopLoc_Location.hxx>
#include <TopoDS_Shape.hxx>
#include <XCAFDoc_ColorTool.hxx>
#include <XCAFDoc_ColorType.hxx>
#include <XCAFDoc_DocumentTool.hxx>
#include <XCAFDoc_ShapeTool.hxx>
#include <IFSelect_ReturnStatus.hxx>
#include <TCollection_ExtendedString.hxx>
#include <TopoDS_Compound.hxx>

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <sstream>
#include <fstream>
#include <vector>
#include <string>
#include <optional>
#include <cstdint>
#include <cstdio>

using namespace emscripten;

class VectorBuffer : public std::streambuf {
public:
    VectorBuffer(const std::vector<uint8_t>& v) {
        setg((char*)v.data(), (char*)v.data(), (char*)(v.data() + v.size()));
    }
};

EMSCRIPTEN_DECLARE_VAL_TYPE(ShapeNodeArray)

struct ShapeNode {
    std::optional<TopoDS_Shape> shape;
    std::optional<std::string> color;
    std::vector<ShapeNode> children;
    std::string name;

    ShapeNodeArray getChildren() const {
        return ShapeNodeArray(val::array(children));
    }
};

namespace {

// ==================== Name helpers ====================

std::string getLabelNameNoRef(const TDF_Label& label) {
    Handle(TDataStd_Name) nameAttr = new TDataStd_Name();
    if (!label.FindAttribute(nameAttr->GetID(), nameAttr)) {
        return std::string();
    }
    Standard_Integer len = nameAttr->Get().LengthOfCString();
    char* buf = new char[len + 1];
    nameAttr->Get().ToUTF8CString(buf);
    std::string name(buf, len);
    delete[] buf;
    return name;
}

std::string getLabelName(const TDF_Label& label, const Handle(XCAFDoc_ShapeTool)& shapeTool) {
    if (XCAFDoc_ShapeTool::IsReference(label)) {
        TDF_Label ref;
        shapeTool->GetReferredShape(label, ref);
        return getLabelName(ref, shapeTool);
    }
    return getLabelNameNoRef(label);
}

std::string getShapeName(const TopoDS_Shape& shape, const Handle(XCAFDoc_ShapeTool)& shapeTool) {
    TDF_Label label;
    if (!shapeTool->Search(shape, label)) {
        return std::string();
    }
    return getLabelName(label, shapeTool);
}

// ==================== Color helpers ====================

bool getLabelColorNoRef(const TDF_Label& label, const Handle(XCAFDoc_ColorTool)& colorTool,
    std::string& color) {
    static const std::vector<XCAFDoc_ColorType> colorTypes = {
        XCAFDoc_ColorSurf, XCAFDoc_ColorCurv, XCAFDoc_ColorGen
    };
    Quantity_Color qColor;
    for (XCAFDoc_ColorType colorType : colorTypes) {
        if (colorTool->GetColor(label, colorType, qColor)) {
            color = std::string(Quantity_Color::ColorToHex(qColor).ToCString());
            return true;
        }
    }
    return false;
}

bool getLabelColor(const TDF_Label& label, const Handle(XCAFDoc_ShapeTool)& shapeTool,
    const Handle(XCAFDoc_ColorTool)& colorTool, std::string& color) {
    if (getLabelColorNoRef(label, colorTool, color)) {
        return true;
    }
    if (XCAFDoc_ShapeTool::IsReference(label)) {
        TDF_Label ref;
        shapeTool->GetReferredShape(label, ref);
        return getLabelColor(ref, shapeTool, colorTool, color);
    }
    return false;
}

bool getShapeColor(const TopoDS_Shape& shape, const Handle(XCAFDoc_ShapeTool)& shapeTool,
    const Handle(XCAFDoc_ColorTool)& colorTool, std::string& color) {
    TDF_Label label;
    if (!shapeTool->Search(shape, label)) {
        return false;
    }
    return getLabelColor(label, shapeTool, colorTool, color);
}

// ==================== Tree structure helpers ====================

bool isFreeShape(const TDF_Label& label, const Handle(XCAFDoc_ShapeTool)& shapeTool) {
    TopoDS_Shape tmpShape;
    return shapeTool->GetShape(label, tmpShape) && shapeTool->IsFree(label);
}

bool isMeshNode(const TDF_Label& label, const Handle(XCAFDoc_ShapeTool)& shapeTool) {
    if (!label.HasChild()) {
        return true;
    }

    bool hasSubShapeChild = false;
    for (TDF_ChildIterator it(label); it.More(); it.Next()) {
        if (shapeTool->IsSubShape(it.Value())) {
            hasSubShapeChild = true;
            break;
        }
    }
    if (hasSubShapeChild) {
        return true;
    }

    bool hasFreeShapeChild = false;
    for (TDF_ChildIterator it(label); it.More(); it.Next()) {
        if (isFreeShape(it.Value(), shapeTool)) {
            hasFreeShapeChild = true;
            break;
        }
    }
    return !hasFreeShapeChild;
}

ShapeNode initLabelNode(const TDF_Label& label, const Handle(XCAFDoc_ShapeTool)& shapeTool,
    const Handle(XCAFDoc_ColorTool)& colorTool) {
    std::string color;
    getLabelColor(label, shapeTool, colorTool, color);
    return ShapeNode {
        .shape = std::nullopt,
        .color = color.empty() ? std::nullopt : std::make_optional(color),
        .children = {},
        .name = getLabelName(label, shapeTool),
    };
}

ShapeNode initShapeNode(const TopoDS_Shape& shape, const Handle(XCAFDoc_ShapeTool)& shapeTool,
    const Handle(XCAFDoc_ColorTool)& colorTool) {
    std::string color;
    getShapeColor(shape, shapeTool, colorTool, color);
    return ShapeNode {
        .shape = shape,
        .color = color.empty() ? std::nullopt : std::make_optional(color),
        .children = {},
        .name = getShapeName(shape, shapeTool),
    };
}

ShapeNode initGroupNode(const TopoDS_Shape& shape, const Handle(XCAFDoc_ShapeTool)& shapeTool) {
    return ShapeNode {
        .shape = std::nullopt,
        .color = std::nullopt,
        .children = {},
        .name = getShapeName(shape, shapeTool),
    };
}

ShapeNode parseShape(TopoDS_Shape& shape, const Handle(XCAFDoc_ShapeTool)& shapeTool,
    const Handle(XCAFDoc_ColorTool)& colorTool) {
    if (shape.ShapeType() == TopAbs_COMPOUND || shape.ShapeType() == TopAbs_COMPSOLID) {
        auto node = initGroupNode(shape, shapeTool);
        TopoDS_Iterator iter(shape);
        while (iter.More()) {
            auto subShape = iter.Value();
            node.children.push_back(parseShape(subShape, shapeTool, colorTool));
            iter.Next();
        }
        return node;
    }
    return initShapeNode(shape, shapeTool, colorTool);
}

ShapeNode parseLabelToNode(const TDF_Label& label, const Handle(XCAFDoc_ShapeTool)& shapeTool,
    const Handle(XCAFDoc_ColorTool)& colorTool) {
    if (isMeshNode(label, shapeTool)) {
        auto shape = shapeTool->GetShape(label);
        return parseShape(shape, shapeTool, colorTool);
    }
    auto node = initLabelNode(label, shapeTool, colorTool);
    for (TDF_ChildIterator it(label); it.More(); it.Next()) {
        TDF_Label child = it.Value();
        if (isFreeShape(child, shapeTool)) {
            node.children.push_back(parseLabelToNode(child, shapeTool, colorTool));
        }
    }
    return node;
}

ShapeNode parseDocumentToNode(Handle(TDocStd_Document) document) {
    TDF_Label mainLabel = document->Main();
    Handle(XCAFDoc_ShapeTool) shapeTool = XCAFDoc_DocumentTool::ShapeTool(mainLabel);
    Handle(XCAFDoc_ColorTool) colorTool = XCAFDoc_DocumentTool::ColorTool(mainLabel);

    auto rootLabel = shapeTool->Label();
    ShapeNode root = initLabelNode(rootLabel, shapeTool, colorTool);
    for (TDF_ChildIterator it(rootLabel); it.More(); it.Next()) {
        TDF_Label child = it.Value();
        if (isFreeShape(child, shapeTool)) {
            root.children.push_back(parseLabelToNode(child, shapeTool, colorTool));
        }
    }
    return root;
}

// ==================== I/O helpers ====================

void writeBufferToFile(const std::string& fileName, const Uint8Array& buffer) {
    std::vector<uint8_t> input = convertJSArrayToNumberVector<uint8_t>(buffer);
    std::ofstream file(fileName, std::ios::binary);
    file.write(reinterpret_cast<const char*>(input.data()), input.size());
    file.close();
}

val toUint8Array(const std::string& data) {
    val uint8Array = val::global("Uint8Array").new_(data.size());
    val memView = val(typed_memory_view(data.size(),
        reinterpret_cast<const uint8_t*>(data.data())));
    uint8Array.call<void>("set", memView);
    return uint8Array;
}

std::string fromUint8Array(const Uint8Array& buffer) {
    std::vector<uint8_t> vec = convertJSArrayToNumberVector<uint8_t>(buffer);
    return std::string(vec.begin(), vec.end());
}


// ==================== ShapeNode → XCAF Document ====================

Quantity_Color parseHexColor(const std::string& hex) {
    Quantity_Color color;
    Quantity_Color::ColorFromHex(hex.c_str(), color);
    return color;
}

void addNodeToDocument(const ShapeNode& node,
    const Handle(XCAFDoc_ShapeTool)& shapeTool,
    const Handle(XCAFDoc_ColorTool)& colorTool,
    const TDF_Label& parentLabel) {

    if (node.shape.has_value()) {
        TDF_Label label = shapeTool->AddShape(node.shape.value(), Standard_False);
        if (!node.name.empty()) {
            TDataStd_Name::Set(label,
                TCollection_ExtendedString(node.name.c_str(), Standard_True));
        }
        if (node.color.has_value()) {
            colorTool->SetColor(label, parseHexColor(node.color.value()), XCAFDoc_ColorSurf);
        }
        if (!parentLabel.IsNull()) {
            shapeTool->AddComponent(parentLabel, label, TopLoc_Location());
        }
        return;
    }

    if (node.children.empty()) return;

    TopoDS_Compound compound;
    BRep_Builder builder;
    builder.MakeCompound(compound);
    TDF_Label asmLabel = shapeTool->AddShape(compound, Standard_True);
    if (!node.name.empty()) {
        TDataStd_Name::Set(asmLabel,
            TCollection_ExtendedString(node.name.c_str(), Standard_True));
    }
    if (node.color.has_value()) {
        colorTool->SetColor(asmLabel, parseHexColor(node.color.value()), XCAFDoc_ColorSurf);
    }
    if (!parentLabel.IsNull()) {
        shapeTool->AddComponent(parentLabel, asmLabel, TopLoc_Location());
    }

    for (const auto& child : node.children) {
        addNodeToDocument(child, shapeTool, colorTool, asmLabel);
    }
}

Handle(TDocStd_Document) buildDocumentFromNode(const ShapeNode& root) {
    Handle(TDocStd_Document) doc = new TDocStd_Document("MDTV-XCAF");
    XCAFDoc_DocumentTool::Set(doc->Main());
    Handle(XCAFDoc_ShapeTool) shapeTool = XCAFDoc_DocumentTool::ShapeTool(doc->Main());
    Handle(XCAFDoc_ColorTool) colorTool = XCAFDoc_DocumentTool::ColorTool(doc->Main());

    for (const auto& child : root.children) {
        addNodeToDocument(child, shapeTool, colorTool, TDF_Label());
    }

    shapeTool->UpdateAssemblies();
    return doc;
}

// ==================== STEP ====================

std::optional<ShapeNode> importSTEP(const Uint8Array& buffer) {
    std::vector<uint8_t> input = convertJSArrayToNumberVector<uint8_t>(buffer);
    VectorBuffer vectorBuffer(input);
    std::istream iss(&vectorBuffer);

    STEPCAFControl_Reader reader;
    reader.SetColorMode(true);
    reader.SetNameMode(true);
    if (reader.ReadStream("stp", iss) != IFSelect_RetDone) {
        return std::nullopt;
    }

    Handle(TDocStd_Document) document = new TDocStd_Document("MDTV-XCAF");
    XCAFDoc_DocumentTool::Set(document->Main());
    if (!reader.Transfer(document)) {
        return std::nullopt;
    }

    return parseDocumentToNode(document);
}

val exportSTEP(const ShapeNode& root) {
    Handle(TDocStd_Document) doc = buildDocumentFromNode(root);

    STEPCAFControl_Writer writer;
    writer.SetColorMode(true);
    writer.SetNameMode(true);
    if (!writer.Transfer(doc, STEPControl_AsIs)) {
        return val::null();
    }

    std::ostringstream oss;
    if (writer.WriteStream(oss) != IFSelect_RetDone) {
        return val::null();
    }
    return toUint8Array(oss.str());
}


// ==================== IGES ====================

std::optional<ShapeNode> importIGES(const Uint8Array& buffer) {
    std::string tmpFile = "/tmp/temp_import.igs";
    writeBufferToFile(tmpFile, buffer);

    IGESCAFControl_Reader reader;
    reader.SetColorMode(true);
    reader.SetNameMode(true);
    if (reader.ReadFile(tmpFile.c_str()) != IFSelect_RetDone) {
        std::remove(tmpFile.c_str());
        return std::nullopt;
    }

    Handle(TDocStd_Document) document = new TDocStd_Document("MDTV-XCAF");
    XCAFDoc_DocumentTool::Set(document->Main());
    if (!reader.Transfer(document)) {
        std::remove(tmpFile.c_str());
        return std::nullopt;
    }

    std::remove(tmpFile.c_str());
    return parseDocumentToNode(document);
}

val exportIGES(const ShapeNode& root) {
    Handle(TDocStd_Document) doc = buildDocumentFromNode(root);

    IGESCAFControl_Writer writer;
    writer.SetColorMode(true);
    writer.SetNameMode(true);
    if (!writer.Transfer(doc)) {
        return val::null();
    }
    writer.ComputeModel();

    std::ostringstream oss;
    if (!writer.Write(oss)) {
        return val::null();
    }
    return toUint8Array(oss.str());
}


// ==================== STL ====================

std::optional<ShapeNode> importSTL(const Uint8Array& buffer) {
    std::string tmpFile = "/tmp/temp_import.stl";
    writeBufferToFile(tmpFile, buffer);

    StlAPI_Reader reader;
    TopoDS_Shape shape;
    if (!reader.Read(shape, tmpFile.c_str())) {
        std::remove(tmpFile.c_str());
        return std::nullopt;
    }

    std::remove(tmpFile.c_str());
    return ShapeNode {
        .shape = shape,
        .color = std::nullopt,
        .children = {},
        .name = "STL Shape",
    };
}

val exportSTL(const TopoShapeArray& input, double linearDeflection, double angularDeflection) {
    TopoDS_Compound compound = Compound::fromShapes(input);

    BRepMesh_IncrementalMesh mesh(compound, linearDeflection, Standard_False, angularDeflection);
    mesh.Perform();

    std::string tmpFile = "/tmp/temp_export.stl";
    StlAPI_Writer writer;
    writer.ASCIIMode() = Standard_False;
    if (!writer.Write(compound, tmpFile.c_str())) {
        return val::null();
    }

    std::ifstream file(tmpFile, std::ios::binary);
    std::string content((std::istreambuf_iterator<char>(file)),
                         std::istreambuf_iterator<char>());
    file.close();
    std::remove(tmpFile.c_str());
    return toUint8Array(content);
}

// ==================== BRep ====================

val exportBREP(const TopoShapeArray& input) {
    TopoDS_Compound compound = Compound::fromShapes(input);
    std::ostringstream oss;
    BRepTools::Write(compound, oss);
    return toUint8Array(oss.str());
}

TopoDS_Shape importBREP(const Uint8Array& buffer) {
    std::string data = fromUint8Array(buffer);
    std::istringstream iss(data);
    TopoDS_Shape output;
    BRep_Builder builder;
    BRepTools::Read(output, iss, builder);
    return output;
}

} // anonymous namespace

namespace ExchangeBindings {

struct Exchange {};

void registerBindings() {
    register_type<ShapeNodeArray>("Array<ShapeNode>");
    register_optional<ShapeNode>();
    register_optional<TopoDS_Shape>();

    class_<ShapeNode>("ShapeNode")
        .property("shape", &ShapeNode::shape)
        .property("color", &ShapeNode::color)
        .property("name", &ShapeNode::name)
        .function("getChildren", &ShapeNode::getChildren);

    class_<Exchange>("Exchange")
        .class_function("importSTEP", &importSTEP)
        .class_function("importIGES", &importIGES)
        .class_function("importSTL", &importSTL)
        .class_function("exportSTEP", &exportSTEP)
        .class_function("exportIGES", &exportIGES)
        .class_function("exportSTL", &exportSTL)
        .class_function("exportBREP", &exportBREP)
        .class_function("importBREP", &importBREP);
}

} // namespace ExchangeBindings
