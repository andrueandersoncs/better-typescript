package prefer_effect_schema_constructor

import (
	"fmt"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

var Rule = rule.Rule{Name: "prefer-effect-schema-constructor", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	report := func(literal *ast.Node) {
		tag := tagValue(literal)
		if tag != "" {
			ctx.ReportNode(literal, rule.RuleMessage{Id: "prefer-effect-schema-constructor", Description: fmt.Sprintf("Avoid declaring or returning a raw %q object literal.", tag), Help: fmt.Sprintf("Reuse the existing Effect Schema for the %q protocol variant and construct it through schema.make. If no such model exists, first decide whether this tagged value is an independent protocol concept or this function is only a procedural seam. Model a reusable boundary-crossing variant with Schema.TaggedStruct and a same-named decoded interface; use Schema.TaggedUnion for boundary-crossing unions. Use Data.TaggedEnum for internal workflow decisions or state, and Schema.TaggedErrorClass only for typed errors.", tag)})
		} else {
			ctx.ReportNode(literal, rule.RuleMessage{Id: "prefer-effect-schema-constructor", Description: "Avoid declaring or returning a raw object literal.", Help: "Reuse an existing Effect Schema whose semantics match this result and construct it through schema.make. If none exists, reconsider whether this function is a real abstraction or a procedural seam that should be collapsed into its owner. For data with independent meaning, define a Schema.Struct with a same-named decoded interface."})
		}
	}
	check := func(expression *ast.Node) {
		for _, branch := range branches(expression) {
			if ast.IsObjectLiteralExpression(branch) && len(branch.AsObjectLiteralExpression().Properties.Nodes) > 0 {
				report(branch)
			}
		}
	}
	checkReturn := func(owner, expression *ast.Node) {
		if !hasForeignReturnContract(ctx, owner) {
			check(expression)
		}
	}
	return rule.RuleListeners{ast.KindReturnStatement: func(node *ast.Node) {
		if node.AsReturnStatement().Expression != nil {
			checkReturn(enclosingFunction(node), node.AsReturnStatement().Expression)
		}
	}, ast.KindArrowFunction: func(node *ast.Node) {
		body := node.BodyData().Body
		if body != nil && !ast.IsBlock(body) {
			checkReturn(node, body)
		}
	}, ast.KindVariableDeclaration: func(node *ast.Node) {
		if node.AsVariableDeclaration().Initializer != nil && insideFunction(node) {
			check(node.AsVariableDeclaration().Initializer)
		}
	}}
}}

func insideFunction(n *ast.Node) bool {
	for n = n.Parent; n != nil; n = n.Parent {
		if ast.IsFunctionLike(n) {
			return true
		}
	}
	return false
}
func branches(n *ast.Node) []*ast.Node {
	n = unwrap(n)
	if ast.IsConditionalExpression(n) {
		c := n.AsConditionalExpression()
		return append(branches(c.WhenTrue), branches(c.WhenFalse)...)
	}
	if ast.IsBinaryExpression(n) {
		k := n.AsBinaryExpression().OperatorToken.Kind
		if k == ast.KindQuestionQuestionToken || k == ast.KindBarBarToken || k == ast.KindAmpersandAmpersandToken {
			return branches(n.AsBinaryExpression().Right)
		}
	}
	return []*ast.Node{n}
}
func tagValue(n *ast.Node) string {
	for _, property := range n.AsObjectLiteralExpression().Properties.Nodes {
		if !ast.IsPropertyAssignment(property) || propertyName(property) != "_tag" {
			continue
		}
		value := unwrap(property.AsPropertyAssignment().Initializer)
		if ast.IsStringLiteralLike(value) {
			return value.AsStringLiteral().Text
		}
	}
	return ""
}
func propertyName(n *ast.Node) string {
	name := n.Name()
	if name != nil && ast.IsIdentifier(name) {
		return name.AsIdentifier().Text
	}
	return ""
}
func unwrap(n *ast.Node) *ast.Node {
	for n != nil {
		switch n.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			n = n.Expression()
		default:
			return n
		}
	}
	return n
}

func enclosingFunction(node *ast.Node) *ast.Node {
	for node = node.Parent; node != nil; node = node.Parent {
		if ast.IsFunctionLike(node) {
			return node
		}
	}
	return nil
}

func hasForeignReturnContract(ctx rule.RuleContext, owner *ast.Node) bool {
	if owner == nil {
		return false
	}
	var typ *checker.Type
	if ast.IsArrowFunction(owner) || ast.IsFunctionExpression(owner) {
		contextual := ctx.TypeChecker.GetContextualType(owner, checker.ContextFlagsNone)
		if contextual != nil {
			if signatures := utils.GetCallSignatures(ctx.TypeChecker, contextual); len(signatures) > 0 {
				typ = ctx.TypeChecker.GetReturnTypeOfSignature(signatures[0])
			}
		}
	}
	if ast.IsMethodDeclaration(owner) {
		contextual := ctx.TypeChecker.GetContextualTypeForObjectLiteralElement(owner, checker.ContextFlagsNone)
		if contextual != nil {
			if signatures := utils.GetCallSignatures(ctx.TypeChecker, contextual); len(signatures) > 0 {
				typ = ctx.TypeChecker.GetReturnTypeOfSignature(signatures[0])
			}
		}
	}
	if typ == nil {
		if signature := ctx.TypeChecker.GetSignatureFromDeclaration(owner); signature != nil {
			typ = ctx.TypeChecker.GetReturnTypeOfSignature(signature)
		}
	}
	return foreignType(ctx, typ, map[*checker.Type]bool{})
}

func foreignType(ctx rule.RuleContext, typ *checker.Type, seen map[*checker.Type]bool) bool {
	if typ == nil || seen[typ] {
		return false
	}
	seen[typ] = true
	if checker.Type_flags(typ)&(checker.TypeFlagsUnion|checker.TypeFlagsIntersection) != 0 {
		for _, part := range typ.Types() {
			if foreignType(ctx, part, seen) {
				return true
			}
		}
		return false
	}
	symbol := checker.Type_symbol(typ)
	if alias := checker.Type_alias(typ); alias != nil && alias.Symbol() != nil {
		symbol = alias.Symbol()
	}
	if symbol == nil {
		return false
	}
	firstParty := false
	defaultLibrary := false
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if !file.IsDeclarationFile && !strings.Contains(path, "/node_modules/") {
			firstParty = true
		}
		if ctx.Program.IsSourceFileDefaultLibrary(file.Path()) {
			defaultLibrary = true
		}
	}
	if defaultLibrary {
		if checker.Type_flags(typ)&checker.TypeFlagsObject != 0 && checker.Type_objectFlags(typ)&checker.ObjectFlagsReference != 0 {
			for _, argument := range ctx.TypeChecker.GetTypeArguments(typ) {
				if foreignType(ctx, argument, seen) {
					return true
				}
			}
		}
		return false
	}
	return !firstParty
}

var PreferEffectSchemaConstructorRule = Rule
