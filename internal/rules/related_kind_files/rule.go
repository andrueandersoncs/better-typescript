package related_kind_files

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

type entityKind struct {
	name     string
	plural   string
	fileName string
}

var (
	algorithmKind = entityKind{name: "algorithm", plural: "algorithms", fileName: "algorithms.ts"}
	configKind    = entityKind{name: "config", plural: "config values", fileName: "config.ts"}
	constantKind  = entityKind{name: "constant", plural: "constants", fileName: "constants.ts"}
	effectKind    = entityKind{name: "effect", plural: "effects", fileName: "effects.ts"}
	errorKind     = entityKind{name: "error", plural: "errors", fileName: "errors.ts"}
	layerKind     = entityKind{name: "layer", plural: "layers", fileName: "layers.ts"}
	schemaKind    = entityKind{name: "schema", plural: "schemas", fileName: "schemas.ts"}
	serviceKind   = entityKind{name: "service", plural: "services", fileName: "services.ts"}
	typeKind      = entityKind{name: "type", plural: "types", fileName: "types.ts"}
)

type anchor struct {
	key  string
	name string
}

type entity struct {
	name         string
	nameNode     *ast.Node
	file         *ast.SourceFile
	kind         entityKind
	anchors      []anchor
	requirements []anchor
}

type indexKey struct{}

func sourcePath(file *ast.SourceFile) string {
	return filepath.ToSlash(filepath.Clean(file.FileName()))
}

func externalSource(file *ast.SourceFile) bool {
	if file == nil {
		return true
	}
	path := sourcePath(file)
	return strings.Contains(path, "/node_modules/") || file.IsDeclarationFile
}

func firstPartyTypeSource(ctx rule.RuleContext, file *ast.SourceFile) bool {
	if file == nil || strings.Contains(sourcePath(file), "/node_modules/") || ctx.Program.IsSourceFileDefaultLibrary(file.Path()) {
		return false
	}
	return !effectSource(file)
}

func effectSource(file *ast.SourceFile) bool {
	if file == nil {
		return false
	}
	for directory := filepath.Dir(file.FileName()); ; directory = filepath.Dir(directory) {
		content, err := os.ReadFile(filepath.Join(directory, "package.json"))
		if err == nil {
			manifest := struct {
				Name string `json:"name"`
			}{}
			return json.Unmarshal(content, &manifest) == nil && manifest.Name == "effect"
		}
		parent := filepath.Dir(directory)
		if parent == directory {
			return false
		}
	}
}

func propertyFromEffect(ctx rule.RuleContext, typ *checker.Type, name string) bool {
	if typ == nil {
		return false
	}
	property := checker.Checker_getPropertyOfType(ctx.TypeChecker, typ, name)
	if property == nil {
		return false
	}
	for _, declaration := range property.Declarations {
		if effectSource(ast.GetSourceFileOfNode(declaration)) {
			return true
		}
	}
	return false
}

func markedKind(ctx rule.RuleContext, typ *checker.Type) (entityKind, bool) {
	switch {
	case propertyFromEffect(ctx, typ, "~effect/Context/Service"):
		return serviceKind, true
	case propertyFromEffect(ctx, typ, "~effect/Config"):
		return configKind, true
	case propertyFromEffect(ctx, typ, "~effect/Layer"):
		return layerKind, true
	case propertyFromEffect(ctx, typ, "~effect/Schema/Schema"):
		return schemaKind, true
	case propertyFromEffect(ctx, typ, "~effect/Effect"):
		return effectKind, true
	default:
		return entityKind{}, false
	}
}

func isEffectType(ctx rule.RuleContext, typ *checker.Type) bool {
	return effectBrandType(ctx, typ) != nil
}

func typeArguments(ctx rule.RuleContext, typ *checker.Type) []*checker.Type {
	if typ == nil {
		return nil
	}
	if alias := checker.Type_alias(typ); alias != nil && len(alias.TypeArguments()) > 0 {
		return alias.TypeArguments()
	}
	if checker.Type_flags(typ)&checker.TypeFlagsObject != 0 && checker.Type_objectFlags(typ)&checker.ObjectFlagsReference != 0 {
		return checker.Checker_getTypeArguments(ctx.TypeChecker, typ)
	}
	return nil
}

func resolvedSymbol(ctx rule.RuleContext, symbol *ast.Symbol) *ast.Symbol {
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		return ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	return symbol
}

func typeSymbol(ctx rule.RuleContext, typ *checker.Type) *ast.Symbol {
	if typ == nil {
		return nil
	}
	symbol := checker.Type_symbol(typ)
	if alias := checker.Type_alias(typ); alias != nil && alias.Symbol() != nil {
		symbol = alias.Symbol()
	}
	return resolvedSymbol(ctx, symbol)
}

func namedTypeDeclaration(node *ast.Node) bool {
	return node != nil && node.Name() != nil && ast.IsIdentifier(node.Name()) &&
		(ast.IsInterfaceDeclaration(node) || ast.IsTypeAliasDeclaration(node) || ast.IsClassDeclaration(node) || ast.IsEnumDeclaration(node))
}

func hasNamedTypeDeclaration(symbol *ast.Symbol) bool {
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		if namedTypeDeclaration(declaration) {
			return true
		}
	}
	return false
}

func firstPartySymbolAnchor(ctx rule.RuleContext, symbol *ast.Symbol) (anchor, bool) {
	symbol = resolvedSymbol(ctx, symbol)
	if symbol == nil || symbol.Name == "" {
		return anchor{}, false
	}
	for _, declaration := range symbol.Declarations {
		if !namedTypeDeclaration(declaration) {
			continue
		}
		file := ast.GetSourceFileOfNode(declaration)
		if !firstPartyTypeSource(ctx, file) {
			continue
		}
		return anchor{
			key:  fmt.Sprintf("%s:%d", sourcePath(file), declaration.Pos()),
			name: declaration.Name().Text(),
		}, true
	}
	return anchor{}, false
}

func firstPartyAnchor(ctx rule.RuleContext, typ *checker.Type) (anchor, bool) {
	return firstPartySymbolAnchor(ctx, typeSymbol(ctx, typ))
}

func collectTypeNode(ctx rule.RuleContext, node *ast.Node, result map[string]anchor, excluded string) {
	if node == nil {
		return
	}
	if value, ok := firstPartySymbolAnchor(ctx, ctx.TypeChecker.GetSymbolAtLocation(node)); ok {
		if value.key != excluded {
			addAnchor(result, value)
		}
		return
	}
	node.ForEachChild(func(child *ast.Node) bool {
		collectTypeNode(ctx, child, result, excluded)
		return false
	})
}

func collectDeclarationConstraints(ctx rule.RuleContext, declaration *ast.Node, result map[string]anchor, excluded string) {
	if declaration == nil || !(ast.IsClassDeclaration(declaration) || ast.IsInterfaceDeclaration(declaration) || ast.IsTypeAliasDeclaration(declaration) || ast.IsFunctionLike(declaration)) {
		return
	}
	for _, parameter := range declaration.TypeParameters() {
		collectTypeNode(ctx, parameter.AsTypeParameterDeclaration().Constraint, result, excluded)
	}
}

func primitiveType(typ *checker.Type) bool {
	if typ == nil {
		return true
	}
	flags := checker.Type_flags(typ)
	return flags&(checker.TypeFlagsAny|checker.TypeFlagsUnknown|checker.TypeFlagsStringLike|checker.TypeFlagsNumberLike|checker.TypeFlagsBigIntLike|checker.TypeFlagsBooleanLike|checker.TypeFlagsESSymbolLike|checker.TypeFlagsVoid|checker.TypeFlagsUndefined|checker.TypeFlagsNull|checker.TypeFlagsNever|checker.TypeFlagsTypeParameter) != 0
}

func addAnchor(result map[string]anchor, value anchor) {
	result[value.key] = value
}

func nonPublicDeclaration(node *ast.Node) bool {
	return node != nil && node.ModifierFlags()&(ast.ModifierFlagsPrivate|ast.ModifierFlagsProtected) != 0
}

func collectSignaturePosition(ctx rule.RuleContext, typ *checker.Type, typeNode *ast.Node, primary, requirements map[string]anchor, primarySeen, requirementSeen map[*checker.Type]bool, excluded string, effectAware bool) {
	collectType(ctx, typ, primary, requirements, primarySeen, requirementSeen, excluded, effectAware)
	if success, failure, required, effect := effectChannelTypes(ctx, typ); effectAware && effect {
		collectEffectTypeNode(ctx, typeNode, success, failure, required, primary, requirements, excluded)
	} else {
		collectTypeNode(ctx, typeNode, primary, excluded)
	}
}

func collectSignature(ctx rule.RuleContext, signature *checker.Signature, primary, requirements map[string]anchor, primarySeen, requirementSeen map[*checker.Type]bool, excluded string, effectAware bool) {
	if signature == nil {
		return
	}
	declaration := checker.Signature_declaration(signature)
	if nonPublicDeclaration(declaration) {
		return
	}
	var parameterNodes []*ast.Node
	if declaration != nil {
		collectDeclarationConstraints(ctx, declaration, primary, excluded)
		parameterNodes = declaration.Parameters()
	}
	for index, parameter := range checker.Signature_parameters(signature) {
		var typeNode *ast.Node
		if index < len(parameterNodes) {
			typeNode = parameterNodes[index].Type()
		}
		collectSignaturePosition(ctx, checker.Checker_getTypeOfSymbol(ctx.TypeChecker, parameter), typeNode, primary, requirements, primarySeen, requirementSeen, excluded, effectAware)
	}
	var resultNode *ast.Node
	if declaration != nil {
		resultNode = declaration.Type()
	}
	collectSignaturePosition(ctx, checker.Checker_getReturnTypeOfSignature(ctx.TypeChecker, signature), resultNode, primary, requirements, primarySeen, requirementSeen, excluded, effectAware)
}

func publicProperty(symbol *ast.Symbol) bool {
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		name := declaration.Name()
		if name != nil && ast.IsPrivateIdentifier(name) {
			return false
		}
		if nonPublicDeclaration(declaration) {
			return false
		}
	}
	return true
}

func collectType(ctx rule.RuleContext, typ *checker.Type, primary, requirements map[string]anchor, primarySeen, requirementSeen map[*checker.Type]bool, excluded string, effectAware bool) {
	if typ == nil || primarySeen[typ] {
		return
	}
	primarySeen[typ] = true
	if effectAware {
		if success, failure, required, effect := effectChannelTypes(ctx, typ); effect {
			collectType(ctx, success, primary, requirements, primarySeen, requirementSeen, excluded, true)
			collectType(ctx, failure, primary, requirements, primarySeen, requirementSeen, excluded, true)
			collectType(ctx, required, requirements, nil, requirementSeen, map[*checker.Type]bool{}, excluded, false)
			return
		}
	}
	value, anchored := firstPartyAnchor(ctx, typ)
	self := anchored && value.key == excluded
	if anchored && !self {
		addAnchor(primary, value)
		return
	}
	if primitiveType(typ) {
		return
	}
	flags := checker.Type_flags(typ)
	if flags&(checker.TypeFlagsUnion|checker.TypeFlagsIntersection) != 0 {
		for _, part := range typ.Types() {
			collectType(ctx, part, primary, requirements, primarySeen, requirementSeen, excluded, effectAware)
		}
		return
	}
	for _, argument := range typeArguments(ctx, typ) {
		collectType(ctx, argument, primary, requirements, primarySeen, requirementSeen, excluded, effectAware)
	}
	if !self && hasNamedTypeDeclaration(typeSymbol(ctx, typ)) {
		return
	}
	for _, property := range checker.Checker_getPropertiesOfType(ctx.TypeChecker, typ) {
		if publicProperty(property) {
			collectType(ctx, checker.Checker_getTypeOfSymbol(ctx.TypeChecker, property), primary, requirements, primarySeen, requirementSeen, excluded, effectAware)
		}
	}
	for _, signature := range utils.GetCallSignatures(ctx.TypeChecker, typ) {
		collectSignature(ctx, signature, primary, requirements, primarySeen, requirementSeen, excluded, effectAware)
	}
}

func effectBrandType(ctx rule.RuleContext, typ *checker.Type) *checker.Type {
	property := checker.Checker_getPropertyOfType(ctx.TypeChecker, typ, "~effect/Effect")
	if property == nil {
		return nil
	}
	fromEffect := false
	for _, declaration := range property.Declarations {
		if effectSource(ast.GetSourceFileOfNode(declaration)) {
			fromEffect = true
			break
		}
	}
	if !fromEffect {
		return nil
	}
	return checker.Checker_getTypeOfSymbol(ctx.TypeChecker, property)
}

func brandPropertyType(ctx rule.RuleContext, brand *checker.Type, names []string) *checker.Type {
	for _, name := range names {
		propertyType := checker.Checker_getTypeOfPropertyOfType(ctx.TypeChecker, brand, name)
		if propertyType == nil {
			continue
		}
		arguments := typeArguments(ctx, propertyType)
		if len(arguments) == 1 {
			return arguments[0]
		}
		return propertyType
	}
	return nil
}

func effectChannelTypes(ctx rule.RuleContext, typ *checker.Type) (success, failure, requirements *checker.Type, ok bool) {
	brand := effectBrandType(ctx, typ)
	if brand == nil {
		return nil, nil, nil, false
	}
	return brandPropertyType(ctx, brand, []string{"_A", "success"}),
		brandPropertyType(ctx, brand, []string{"_E", "error"}),
		brandPropertyType(ctx, brand, []string{"_R", "requirements"}), true
}

func sameType(ctx rule.RuleContext, left, right *checker.Type) bool {
	return left != nil && right != nil &&
		checker.Checker_isTypeAssignableTo(ctx.TypeChecker, left, right) &&
		checker.Checker_isTypeAssignableTo(ctx.TypeChecker, right, left)
}

func collectEffectTypeNode(ctx rule.RuleContext, node *ast.Node, success, failure, required *checker.Type, primary, requirements map[string]anchor, excluded string) {
	if node == nil {
		return
	}
	symbol := resolvedSymbol(ctx, ctx.TypeChecker.GetSymbolAtLocation(node))
	if value, ok := firstPartySymbolAnchor(ctx, symbol); ok {
		candidate := checker.Checker_getDeclaredTypeOfSymbol(ctx.TypeChecker, symbol)
		switch {
		case sameType(ctx, candidate, success), sameType(ctx, candidate, failure):
			if value.key != excluded {
				addAnchor(primary, value)
			}
		case requirements != nil && sameType(ctx, candidate, required):
			if value.key != excluded {
				addAnchor(requirements, value)
			}
		}
		return
	}
	node.ForEachChild(func(child *ast.Node) bool {
		collectEffectTypeNode(ctx, child, success, failure, required, primary, requirements, excluded)
		return false
	})
}

func sortedAnchors(values map[string]anchor) []anchor {
	result := make([]anchor, 0, len(values))
	for _, value := range values {
		result = append(result, value)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].key < result[j].key })
	return result
}

func relationForType(ctx rule.RuleContext, typ *checker.Type, typeNode *ast.Node, callable bool, excluded string) ([]anchor, []anchor) {
	primary := map[string]anchor{}
	requirements := map[string]anchor{}
	primarySeen := map[*checker.Type]bool{}
	requirementSeen := map[*checker.Type]bool{}
	if callable {
		for _, signature := range utils.GetCallSignatures(ctx.TypeChecker, typ) {
			collectSignature(ctx, signature, primary, requirements, primarySeen, requirementSeen, excluded, true)
		}
	} else {
		collectSignaturePosition(ctx, typ, typeNode, primary, requirements, primarySeen, requirementSeen, excluded, true)
	}
	return sortedAnchors(primary), sortedAnchors(requirements)
}

func callablesReturnEffect(ctx rule.RuleContext, typ *checker.Type) bool {
	signatures := utils.GetCallSignatures(ctx.TypeChecker, typ)
	if len(signatures) == 0 {
		return false
	}
	for _, signature := range signatures {
		if !isEffectType(ctx, checker.Checker_getReturnTypeOfSignature(ctx.TypeChecker, signature)) {
			return false
		}
	}
	return true
}

func symbolFromEffect(ctx rule.RuleContext, node *ast.Node, names map[string]bool) bool {
	if node == nil || !ast.IsIdentifier(node) {
		return false
	}
	symbol := resolvedSymbol(ctx, ctx.TypeChecker.GetSymbolAtLocation(node))
	if symbol == nil || !names[symbol.Name] {
		return false
	}
	for _, declaration := range symbol.Declarations {
		if effectSource(ast.GetSourceFileOfNode(declaration)) {
			return true
		}
	}
	return false
}

func containsEffectSymbol(ctx rule.RuleContext, node *ast.Node, names map[string]bool) bool {
	if node == nil {
		return false
	}
	if symbolFromEffect(ctx, node, names) {
		return true
	}
	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if containsEffectSymbol(ctx, child, names) {
			found = true
			return true
		}
		return false
	})
	return found
}

func errorClass(node *ast.Node) bool {
	if !ast.IsClassDeclaration(node) || node.Name() == nil {
		return false
	}
	name := node.Name().Text()
	return strings.HasSuffix(name, "Error") || strings.HasSuffix(name, "Failure") || strings.HasSuffix(name, "Exception")
}

func schemaDerivedType(ctx rule.RuleContext, node *ast.Node) bool {
	return (ast.IsTypeAliasDeclaration(node) || ast.IsInterfaceDeclaration(node)) && containsEffectSymbol(ctx, node, map[string]bool{"Type": true})
}

func heritageBase(node *ast.Node) *ast.Node {
	for node != nil {
		switch {
		case ast.IsCallExpression(node):
			node = node.AsCallExpression().Expression
		case ast.IsParenthesizedExpression(node):
			node = node.Expression()
		default:
			if ast.IsPropertyAccessExpression(node) {
				return node.Name()
			}
			return node
		}
	}
	return nil
}

func classHeritageHasEffectSymbol(ctx rule.RuleContext, node *ast.Node, names map[string]bool) bool {
	clauses := node.AsClassDeclaration().HeritageClauses
	if clauses == nil {
		return false
	}
	for _, clause := range clauses.Nodes {
		for _, heritage := range clause.AsHeritageClause().Types.Nodes {
			base := heritageBase(heritage.AsExpressionWithTypeArguments().Expression)
			if symbolFromEffect(ctx, base, names) {
				return true
			}
		}
	}
	return false
}

func classKind(ctx rule.RuleContext, node *ast.Node) entityKind {
	if errorClass(node) || classHeritageHasEffectSymbol(ctx, node, map[string]bool{"TaggedError": true, "TaggedErrorClass": true, "ErrorClass": true}) {
		return errorKind
	}
	if classHeritageHasEffectSymbol(ctx, node, map[string]bool{"Service": true, "Tag": true}) {
		return serviceKind
	}
	if classHeritageHasEffectSymbol(ctx, node, map[string]bool{"Class": true, "TaggedClass": true}) {
		return schemaKind
	}
	return typeKind
}

func classify(ctx rule.RuleContext, node, name *ast.Node) (entityKind, *checker.Type, bool) {
	if name == nil || !ast.IsIdentifier(name) {
		return entityKind{}, nil, false
	}
	typ := ctx.TypeChecker.GetTypeAtLocation(name)
	if ast.IsFunctionDeclaration(node) {
		if callablesReturnEffect(ctx, typ) {
			return effectKind, typ, true
		}
		return algorithmKind, typ, true
	}
	if ast.IsVariableDeclaration(node) {
		if kind, ok := markedKind(ctx, typ); ok {
			return kind, typ, len(utils.GetCallSignatures(ctx.TypeChecker, typ)) > 0
		}
		if callablesReturnEffect(ctx, typ) {
			return effectKind, typ, true
		}
		if len(utils.GetCallSignatures(ctx.TypeChecker, typ)) > 0 {
			return algorithmKind, typ, true
		}
		return constantKind, typ, false
	}
	if ast.IsClassDeclaration(node) {
		symbol := resolvedSymbol(ctx, ctx.TypeChecker.GetSymbolAtLocation(name))
		if symbol != nil {
			if declared := checker.Checker_getDeclaredTypeOfSymbol(ctx.TypeChecker, symbol); declared != nil {
				typ = declared
			}
		}
		return classKind(ctx, node), typ, false
	}
	if ast.IsInterfaceDeclaration(node) || ast.IsTypeAliasDeclaration(node) {
		if schemaDerivedType(ctx, node) {
			return schemaKind, typ, false
		}
		return typeKind, typ, false
	}
	if ast.IsEnumDeclaration(node) {
		return typeKind, typ, false
	}
	return entityKind{}, nil, false
}

func topLevelEntities(ctx rule.RuleContext, file *ast.SourceFile) []entity {
	if file == nil || externalSource(file) {
		return nil
	}
	previous := ctx.SourceFile
	ctx.SourceFile = file
	defer func() { ctx.SourceFile = previous }()
	result := []entity{}
	appendEntity := func(node, name *ast.Node) {
		kind, typ, callable := classify(ctx, node, name)
		if typ == nil || kind.name == "" {
			return
		}
		selfKey := fmt.Sprintf("%s:%d", sourcePath(file), node.Pos())
		var typeNode *ast.Node
		if ast.IsVariableDeclaration(node) {
			typeNode = node.Type()
		}
		anchors, requirements := relationForType(ctx, typ, typeNode, callable, selfKey)
		values := map[string]anchor{}
		for _, value := range anchors {
			values[value.key] = value
		}
		requirementValues := map[string]anchor{}
		for _, value := range requirements {
			requirementValues[value.key] = value
		}
		collectDeclarationConstraints(ctx, node, values, selfKey)
		if ast.IsClassDeclaration(node) {
			classSymbol := resolvedSymbol(ctx, ctx.TypeChecker.GetSymbolAtLocation(name))
			if classSymbol != nil {
				constructorType := checker.Checker_getTypeOfSymbol(ctx.TypeChecker, classSymbol)
				collectType(ctx, constructorType, values, requirementValues, map[*checker.Type]bool{}, map[*checker.Type]bool{}, selfKey, true)
				for _, signature := range checker.Checker_getSignaturesOfType(ctx.TypeChecker, constructorType, checker.SignatureKindConstruct) {
					collectSignature(ctx, signature, values, requirementValues, map[*checker.Type]bool{}, map[*checker.Type]bool{}, selfKey, true)
				}
			}
		}
		if len(values) == 0 {
			for key, value := range requirementValues {
				values[key] = value
			}
		}
		anchors = sortedAnchors(values)
		requirements = sortedAnchors(requirementValues)
		result = append(result, entity{name: name.Text(), nameNode: name, file: file, kind: kind, anchors: anchors, requirements: requirements})
	}
	for _, statement := range file.AsNode().Statements() {
		switch {
		case ast.IsFunctionDeclaration(statement), ast.IsClassDeclaration(statement), ast.IsInterfaceDeclaration(statement), ast.IsTypeAliasDeclaration(statement), ast.IsEnumDeclaration(statement):
			appendEntity(statement, statement.Name())
		case ast.IsVariableStatement(statement):
			list := statement.AsVariableStatement().DeclarationList.AsVariableDeclarationList()
			if list.Flags&ast.NodeFlagsConst == 0 {
				continue
			}
			for _, declaration := range list.Declarations.Nodes {
				appendEntity(declaration, declaration.Name())
			}
		}
	}
	return result
}

func withinRoot(root string, file *ast.SourceFile) bool {
	relative, err := filepath.Rel(root, file.FileName())
	return err == nil && relative != ".." && !strings.HasPrefix(relative, ".."+string(filepath.Separator))
}

func programRoot(ctx rule.RuleContext) string {
	commandLine := ctx.Program.CommandLine()
	if commandLine != nil && commandLine.ConfigFile != nil && commandLine.ConfigFile.SourceFile != nil {
		return filepath.Dir(commandLine.ConfigFile.SourceFile.FileName())
	}
	return ctx.Program.GetCurrentDirectory()
}

func projectIndex(ctx rule.RuleContext) []entity {
	return rule.ProgramCacheValue(ctx, indexKey{}, func() []entity {
		result := []entity{}
		root := programRoot(ctx)
		for _, file := range ctx.Program.SourceFiles() {
			if withinRoot(root, file) {
				result = append(result, topLevelEntities(ctx, file)...)
			}
		}
		sort.Slice(result, func(i, j int) bool {
			left := sourcePath(result[i].file) + fmt.Sprintf(":%09d", result[i].nameNode.Pos())
			right := sourcePath(result[j].file) + fmt.Sprintf(":%09d", result[j].nameNode.Pos())
			return left < right
		})
		return result
	})
}

func anchorKey(values []anchor) string {
	parts := make([]string, len(values))
	for index, value := range values {
		parts[index] = value.key
	}
	return strings.Join(parts, "|")
}

func anchorText(values []anchor) string {
	if len(values) == 0 {
		return "no first-party data types"
	}
	names := make([]string, len(values))
	for index, value := range values {
		names[index] = value.name
	}
	sort.Strings(names)
	return "{" + strings.Join(names, ", ") + "}"
}

func relationshipText(value entity) string {
	text := anchorText(value.anchors)
	if len(value.requirements) > 0 && anchorKey(value.requirements) != anchorKey(value.anchors) {
		text += "; its Effect requirements are " + anchorText(value.requirements)
	}
	return text
}

func relativePath(root, name string) string {
	value, err := filepath.Rel(root, name)
	if err != nil {
		return filepath.ToSlash(name)
	}
	return filepath.ToSlash(value)
}

func wrongFileMessage(value entity) rule.RuleMessage {
	base := filepath.Base(value.file.FileName())
	return rule.RuleMessage{
		Id:          "related-kind-files",
		Description: fmt.Sprintf("%s has kind %s in %s.", value.name, value.kind.name, base),
		Help:        fmt.Sprintf("Place %s entities in %s within a dedicated domain module. Choose the module name from the repository domain vocabulary.", value.kind.name, value.kind.fileName),
	}
}

func checkFile(ctx rule.RuleContext) {
	index := projectIndex(ctx)
	groups := map[string][]entity{}
	for _, value := range index {
		if len(value.anchors) == 0 {
			continue
		}
		key := value.kind.name + ":" + anchorKey(value.anchors)
		groups[key] = append(groups[key], value)
	}
	current := sourcePath(ctx.SourceFile)
	for _, value := range index {
		if sourcePath(value.file) != current {
			continue
		}
		if filepath.Base(value.file.FileName()) != value.kind.fileName {
			ctx.ReportNode(value.nameNode, wrongFileMessage(value))
		}
		if len(value.anchors) == 0 {
			continue
		}
		group := groups[value.kind.name+":"+anchorKey(value.anchors)]
		otherFiles := map[string]bool{}
		for _, other := range group {
			if sourcePath(other.file) != current {
				otherFiles[sourcePath(other.file)] = true
			}
		}
		if len(otherFiles) > 0 {
			files := make([]string, 0, len(otherFiles))
			root := programRoot(ctx)
			for file := range otherFiles {
				files = append(files, relativePath(root, file))
			}
			sort.Strings(files)
			ctx.ReportNode(value.nameNode, rule.RuleMessage{
				Id:          "related-kind-files",
				Description: fmt.Sprintf("%s is split from related %s in %s.", value.name, value.kind.plural, strings.Join(files, ", ")),
				Help:        fmt.Sprintf("Its public signature relates it through %s. Place related %s together in one dedicated module's %s. Choose the module name from the repository domain vocabulary.", relationshipText(value), value.kind.plural, value.kind.fileName),
			})
		}
	}
	if filepath.Base(ctx.SourceFile.FileName()) == "" {
		return
	}
	byKind := map[string]map[string][]entity{}
	for _, value := range index {
		if sourcePath(value.file) != current || len(value.anchors) == 0 || filepath.Base(value.file.FileName()) != value.kind.fileName {
			continue
		}
		if byKind[value.kind.name] == nil {
			byKind[value.kind.name] = map[string][]entity{}
		}
		byKind[value.kind.name][anchorKey(value.anchors)] = append(byKind[value.kind.name][anchorKey(value.anchors)], value)
	}
	for _, groupsForKind := range byKind {
		if len(groupsForKind) < 2 {
			continue
		}
		keys := make([]string, 0, len(groupsForKind))
		for key := range groupsForKind {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		for _, key := range keys {
			otherKey := keys[0]
			if otherKey == key {
				otherKey = keys[1]
			}
			other := groupsForKind[otherKey][0]
			for _, value := range groupsForKind[key] {
				ctx.ReportNode(value.nameNode, rule.RuleMessage{
					Id:          "related-kind-files",
					Description: fmt.Sprintf("%s is mixed with unrelated %s in %s.", value.name, value.kind.plural, value.kind.fileName),
					Help:        fmt.Sprintf("Its public signature relates it through %s, while %s relates through %s. Separate each relationship into its own domain module's %s. Choose module names from the repository domain vocabulary.", relationshipText(value), other.name, relationshipText(other), value.kind.fileName),
				})
			}
		}
	}
}

var Rule = rule.Rule{Name: "related-kind-files", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindEndOfFile: func(_ *ast.Node) { checkFile(ctx) }}
}}
