package bounded_retry_schedule

import (
	"math"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/scanner"
)

var message = rule.RuleMessage{
	Id:          "bounded-retry-schedule",
	Description: "Use a finite retry recurrence unless a local waiver documents forever retry.",
	Help:        "Use Schedule.recurs(n), Schedule.upTo({ times: n }), or a Schedule.max branch that terminates.",
}

var waiverPattern = regexp.MustCompile(`(?i)^//\s*(effect-quality-allow-unbounded-retry|forever-ok|allow-forever)(:|\s)`)

type recurrence int

const (
	unknown recurrence = iota
	finite
	unbounded
)

var Rule = rule.Rule{Name: "bounded-retry-schedule", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		policy := retryPolicy(ctx, node)
		if policy == nil || hasWaiver(ctx, node) || policyRecurrence(ctx, policy) != unbounded {
			return
		}
		ctx.ReportNode(node, message)
	}}
}}

func retryPolicy(ctx rule.RuleContext, node *ast.Node) *ast.Node {
	call := node.AsCallExpression()
	name := effectRetryName(ctx, call.Expression)
	if name == "" {
		return nil
	}
	args := call.Arguments.Nodes
	switch name {
	case "retry":
		if len(args) >= 2 {
			return args[1]
		}
		if len(args) == 1 && isAppliedRetry(node) {
			return args[0]
		}
	case "retryOrElse":
		if len(args) >= 3 {
			return args[1]
		}
		if len(args) == 2 && isAppliedRetry(node) {
			return args[0]
		}
	}
	return nil
}

func effectRetryName(ctx rule.RuleContext, expression *ast.Node) string {
	target := unwrap(expression)
	if ast.IsPropertyAccessExpression(target) {
		target = target.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(target) {
		return ""
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, target)
	if symbol == nil || (symbol.Name != "retry" && symbol.Name != "retryOrElse") || !declaredInEffectFile(symbol, "Effect") {
		return ""
	}
	return symbol.Name
}

func policyRecurrence(ctx rule.RuleContext, node *ast.Node) recurrence {
	node = unwrap(node)
	if !ast.IsObjectLiteralExpression(node) {
		return scheduleRecurrence(ctx, node)
	}
	return optionRecurrence(ctx, node)
}

func optionRecurrence(ctx rule.RuleContext, node *ast.Node) recurrence {
	var schedule *ast.Node
	hasPredicate, unknownTimes := false, false
	times := unknown
	for _, property := range node.AsObjectLiteralExpression().Properties.Nodes {
		if ast.IsSpreadAssignment(property) {
			return unknown
		}
		if !ast.IsPropertyAssignment(property) {
			continue
		}
		name, ok := ast.TryGetTextOfPropertyName(property.Name())
		if !ok {
			return unknown
		}
		switch name {
		case "schedule":
			schedule = property.AsPropertyAssignment().Initializer
		case "times":
			if finiteNumberLiteral(property.AsPropertyAssignment().Initializer) {
				times = finite
			} else {
				unknownTimes = true
			}
		case "while", "until":
			hasPredicate = true
		}
	}
	if times == finite {
		return finite
	}
	if unknownTimes {
		return unknown
	}
	if hasPredicate {
		return unknown
	}
	if schedule == nil {
		return unbounded
	}
	return scheduleRecurrence(ctx, schedule)
}

func scheduleRecurrence(ctx rule.RuleContext, node *ast.Node) recurrence {
	node = unwrap(node)
	if node == nil || !ast.IsCallExpression(node) {
		if isEffectScheduleMember(ctx, node, "forever") {
			return unbounded
		}
		return unknown
	}
	call := node.AsCallExpression()
	if name := effectScheduleCall(ctx, call.Expression); name != "" && name != "pipe" {
		switch name {
		case "recurs":
			if len(call.Arguments.Nodes) == 1 && finiteNumberLiteral(call.Arguments.Nodes[0]) {
				return finite
			}
			if len(call.Arguments.Nodes) == 1 && positiveInfinity(ctx, call.Arguments.Nodes[0]) {
				return unbounded
			}
			return unknown
		case "duration":
			return finite
		case "forever", "exponential", "fibonacci", "fixed", "spaced", "windowed":
			return unbounded
		case "jittered", "passthrough":
			if len(call.Arguments.Nodes) == 1 {
				return scheduleRecurrence(ctx, call.Arguments.Nodes[0])
			}
		case "upTo":
			if len(call.Arguments.Nodes) == 2 && finiteTimes(call.Arguments.Nodes[1]) {
				return finite
			}
		case "max", "min":
			if len(call.Arguments.Nodes) == 1 {
				return combinedRecurrence(ctx, call.Arguments.Nodes[0], name)
			}
		}
		return unknown
	}
	if !ast.IsPropertyAccessExpression(unwrap(call.Expression)) {
		return unknown
	}
	access := unwrap(call.Expression).AsPropertyAccessExpression()
	if access.Name().Text() != "pipe" || len(call.Arguments.Nodes) != 1 {
		return unknown
	}
	base := scheduleRecurrence(ctx, access.Expression)
	return applyScheduleStage(ctx, base, call.Arguments.Nodes[0])
}

func combinedRecurrence(ctx rule.RuleContext, argument *ast.Node, operator string) recurrence {
	values := unwrap(argument)
	if !ast.IsArrayLiteralExpression(values) {
		return unknown
	}
	states := make([]recurrence, 0, len(values.AsArrayLiteralExpression().Elements.Nodes))
	for _, element := range values.AsArrayLiteralExpression().Elements.Nodes {
		if element.Kind == ast.KindSpreadElement {
			return unknown
		}
		states = append(states, scheduleRecurrence(ctx, element))
	}
	if len(states) == 0 {
		return unknown
	}
	if operator == "max" {
		for _, state := range states {
			if state == finite {
				return finite
			}
		}
		for _, state := range states {
			if state == unknown {
				return unknown
			}
		}
		return unbounded
	}
	sawUnknown := false
	for _, state := range states {
		if state == unbounded {
			return unbounded
		}
		if state == unknown {
			sawUnknown = true
		}
	}
	if sawUnknown {
		return unknown
	}
	return finite
}

func applyScheduleStage(ctx rule.RuleContext, base recurrence, stage *ast.Node) recurrence {
	stage = unwrap(stage)
	if !ast.IsCallExpression(stage) {
		switch effectScheduleName(ctx, stage) {
		case "jittered", "passthrough":
			return base
		}
		return unknown
	}
	call := stage.AsCallExpression()
	switch effectScheduleCall(ctx, call.Expression) {
	case "jittered", "passthrough":
		if len(call.Arguments.Nodes) == 1 {
			return base
		}
	case "upTo":
		if len(call.Arguments.Nodes) == 1 && finiteTimes(call.Arguments.Nodes[0]) {
			return finite
		}
	}
	return unknown
}

func finiteTimes(node *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsObjectLiteralExpression(node) {
		return false
	}
	for _, property := range node.AsObjectLiteralExpression().Properties.Nodes {
		if !ast.IsPropertyAssignment(property) {
			continue
		}
		name, ok := ast.TryGetTextOfPropertyName(property.Name())
		if ok && name == "times" {
			return finiteNumberLiteral(property.AsPropertyAssignment().Initializer)
		}
	}
	return false
}

func finiteNumberLiteral(node *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsNumericLiteral(node) {
		return false
	}
	value, err := strconv.ParseFloat(node.Text(), 64)
	return err == nil && !math.IsInf(value, 0) && !math.IsNaN(value)
}

func positiveInfinity(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if ast.IsNumericLiteral(node) {
		value, _ := strconv.ParseFloat(node.Text(), 64)
		return math.IsInf(value, 1)
	}
	target := node
	if ast.IsPropertyAccessExpression(node) {
		target = node.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(target) || (target.Text() != "Infinity" && target.Text() != "POSITIVE_INFINITY") {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, target)
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		if file := ast.GetSourceFileOfNode(declaration); file != nil {
			name := filepath.Base(file.FileName())
			if strings.HasPrefix(name, "lib.") && strings.HasSuffix(name, ".d.ts") {
				return true
			}
		}
	}
	return false
}

func effectScheduleCall(ctx rule.RuleContext, expression *ast.Node) string {
	return effectScheduleName(ctx, expression)
}

func effectScheduleName(ctx rule.RuleContext, node *ast.Node) string {
	target := unwrap(node)
	if ast.IsPropertyAccessExpression(target) {
		target = target.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(target) {
		return ""
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, target)
	if symbol == nil || !declaredInEffectFile(symbol, "Schedule") {
		return ""
	}
	return symbol.Name
}

func isEffectScheduleMember(ctx rule.RuleContext, node *ast.Node, name string) bool {
	return effectScheduleName(ctx, node) == name
}

func declaredInEffectFile(symbol *ast.Symbol, module string) bool {
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := filepath.Base(path)
		if (base == module+".ts" || base == module+".d.ts") &&
			(strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func hasWaiver(ctx rule.RuleContext, node *ast.Node) bool {
	start := scanner.GetTokenPosOfNode(node, ctx.SourceFile, false)
	for _, line := range strings.Split(ctx.SourceFile.Text()[node.Pos():start], "\n") {
		if waiverPattern.MatchString(strings.TrimSpace(line)) {
			return true
		}
	}
	return false
}

func isAppliedRetry(node *ast.Node) bool {
	if node.Parent == nil || !ast.IsCallExpression(node.Parent) {
		return false
	}
	parent := node.Parent.AsCallExpression()
	if parent.Expression == node {
		return true
	}
	if ast.IsPropertyAccessExpression(parent.Expression) && parent.Expression.AsPropertyAccessExpression().Name().Text() != "pipe" {
		return false
	}
	if ast.IsIdentifier(parent.Expression) && parent.Expression.Text() != "pipe" {
		return false
	}
	for _, argument := range parent.Arguments.Nodes {
		if argument == node {
			return true
		}
	}
	return false
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}
