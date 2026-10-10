package test_clock_for_time

import (
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var waitMessage = rule.RuleMessage{
	Id:          "testClockForTime",
	Description: "Do not wait a fixed wall-clock time in tests.",
	Help:        "Await the event or state change, or drive time with fake timers or TestClock.",
}

var testFileName = regexp.MustCompile(`\.(test|spec)\.[cm]?[jt]sx?$`)
var testDirectory = regexp.MustCompile(`(^|/)(test|tests|__tests__)/.*\.[cm]?[jt]sx?$`)

var effectRunners = map[string]bool{
	"runCallback": true, "runFork": true, "runPromise": true, "runPromiseExit": true, "runSync": true, "runSyncExit": true,
}

// fixedWaits holds one file's real-time waits until the file is known not to install fake timers.
type fixedWaits struct {
	fakeTimers bool
	waits      []*ast.Node
}

func isTestFile(ctx rule.RuleContext) bool {
	path := strings.ReplaceAll(ctx.SourceFile.FileName(), "\\", "/")
	if testFileName.MatchString(path) {
		return true
	}
	directory := strings.ReplaceAll(ctx.Program.GetCurrentDirectory(), "\\", "/")
	return testDirectory.MatchString(strings.TrimPrefix(path, strings.TrimSuffix(directory, "/")+"/"))
}

func (w *fixedWaits) visitCall(ctx rule.RuleContext, node *ast.Node) {
	callee := node.AsCallExpression().Expression
	if isFakeTimerInstall(ctx, callee) {
		w.fakeTimers = true
		return
	}
	if isRealSleep(ctx, node) {
		w.waits = append(w.waits, callee)
	}
}

func (w *fixedWaits) visitNew(node *ast.Node) {
	if isTimerPromise(node) && !isHelperResult(node) {
		w.waits = append(w.waits, node)
	}
}

func (w *fixedWaits) report(ctx rule.RuleContext) {
	if w.fakeTimers {
		return
	}
	for _, wait := range w.waits {
		ctx.ReportNode(wait, waitMessage)
	}
}

func isFakeTimerInstall(ctx rule.RuleContext, callee *ast.Node) bool {
	callee = unwrap(callee)
	switch calleeName(callee) {
	case "useFakeTimers":
		return true
	case "install":
		if !ast.IsPropertyAccessExpression(callee) {
			return false
		}
		module, _ := importOf(ctx, unwrap(callee.Expression()))
		return module == "@sinonjs/fake-timers"
	}
	return false
}

func isRealSleep(ctx rule.RuleContext, node *ast.Node) bool {
	callee := unwrap(node.AsCallExpression().Expression)
	if ast.IsPropertyAccessExpression(callee) && calleeName(callee) == "waitForTimeout" {
		return true
	}
	if isBunSleep(ctx, callee) || isLibrarySleep(ctx, callee) || isTimerHelperCall(ctx, callee) {
		return true
	}
	return effectMemberName(ctx, callee) == "sleep" && runsOnLiveClock(ctx, node)
}

func isBunSleep(ctx rule.RuleContext, callee *ast.Node) bool {
	if !ast.IsPropertyAccessExpression(callee) {
		return false
	}
	if name := calleeName(callee); name != "sleep" && name != "sleepSync" {
		return false
	}
	object := unwrap(callee.Expression())
	if !ast.IsIdentifier(object) || object.Text() != "Bun" {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(object)
	if symbol == nil {
		return true
	}
	for _, declaration := range symbol.Declarations {
		if file := ast.GetSourceFileOfNode(declaration); file == nil || !file.IsDeclarationFile {
			return false
		}
	}
	return true
}

func isLibrarySleep(ctx rule.RuleContext, callee *ast.Node) bool {
	member := ""
	if ast.IsPropertyAccessExpression(callee) {
		member = calleeName(callee)
		callee = unwrap(callee.Expression())
	}
	if !ast.IsIdentifier(callee) {
		return false
	}
	module, imported := importOf(ctx, callee)
	if member != "" {
		if imported != "*" && imported != "default" {
			return false
		}
		imported = member
	}
	switch module {
	case "delay", "sleep-promise":
		return true
	case "timers/promises", "node:timers/promises":
		return imported == "setTimeout"
	}
	return false
}

// importOf returns the module and imported name ("default", "*", or the export) behind an imported identifier.
func importOf(ctx rule.RuleContext, identifier *ast.Node) (string, string) {
	if identifier == nil || !ast.IsIdentifier(identifier) {
		return "", ""
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(identifier)
	if symbol == nil || symbol.Flags&ast.SymbolFlagsAlias == 0 || len(symbol.Declarations) == 0 {
		return "", ""
	}
	declaration := symbol.Declarations[0]
	imported := "default"
	switch {
	case ast.IsImportSpecifier(declaration):
		specifier := declaration.AsImportSpecifier()
		imported = specifier.Name().Text()
		if specifier.PropertyName != nil {
			imported = specifier.PropertyName.Text()
		}
	case ast.IsNamespaceImport(declaration):
		imported = "*"
	case !ast.IsImportClause(declaration):
		return "", ""
	}
	for current := declaration.Parent; current != nil; current = current.Parent {
		if ast.IsImportDeclaration(current) {
			return current.AsImportDeclaration().ModuleSpecifier.Text(), imported
		}
	}
	return "", ""
}

func isTimerHelperCall(ctx rule.RuleContext, callee *ast.Node) bool {
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		if helper := helperFunction(declaration); helper != nil && isTimerPromise(soleResult(helper)) {
			return true
		}
	}
	return false
}

func helperFunction(declaration *ast.Node) *ast.Node {
	if ast.IsFunctionDeclaration(declaration) || ast.IsMethodDeclaration(declaration) {
		return declaration
	}
	if !ast.IsVariableDeclaration(declaration) {
		return nil
	}
	initializer := declaration.AsVariableDeclaration().Initializer
	if initializer != nil && (ast.IsArrowFunction(initializer) || ast.IsFunctionExpression(initializer)) {
		return initializer
	}
	return nil
}

// isHelperResult reports a timer promise that a named helper returns; its callers are reported instead.
func isHelperResult(node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) {
			return helperFunction(declarationOf(current)) == current && soleResult(current) == node
		}
	}
	return false
}

func declarationOf(function *ast.Node) *ast.Node {
	if ast.IsArrowFunction(function) || ast.IsFunctionExpression(function) {
		return function.Parent
	}
	return function
}

// soleResult returns the only returned or evaluated expression of a function body, without await.
func soleResult(function *ast.Node) *ast.Node {
	body := function.BodyData().Body
	if body == nil {
		return nil
	}
	if ast.IsBlock(body) {
		statements := body.AsBlock().Statements.Nodes
		if len(statements) != 1 {
			return nil
		}
		switch statement := statements[0]; {
		case ast.IsReturnStatement(statement):
			body = statement.AsReturnStatement().Expression
		case ast.IsExpressionStatement(statement):
			body = statement.AsExpressionStatement().Expression
		default:
			return nil
		}
	}
	body = unwrap(body)
	if body != nil && ast.IsAwaitExpression(body) {
		body = unwrap(body.Expression())
	}
	return body
}

// isTimerPromise matches new Promise(resolve => setTimeout(resolve, ...)) and its () => resolve() form.
func isTimerPromise(node *ast.Node) bool {
	if node == nil || !ast.IsNewExpression(node) {
		return false
	}
	promise := unwrap(node.AsNewExpression().Expression)
	arguments := node.Arguments()
	if !ast.IsIdentifier(promise) || promise.Text() != "Promise" || len(arguments) != 1 {
		return false
	}
	executor := unwrap(arguments[0])
	if !ast.IsArrowFunction(executor) && !ast.IsFunctionExpression(executor) {
		return false
	}
	parameters := executor.Parameters()
	if len(parameters) == 0 || !ast.IsIdentifier(parameters[0].Name()) {
		return false
	}
	timer := soleResult(executor)
	if timer == nil || !ast.IsCallExpression(timer) || !isGlobalSetTimeout(timer.AsCallExpression().Expression) {
		return false
	}
	timerArguments := timer.Arguments()
	return len(timerArguments) > 0 && callsResolve(timerArguments[0], parameters[0].Name().Text())
}

func isGlobalSetTimeout(callee *ast.Node) bool {
	callee = unwrap(callee)
	if ast.IsIdentifier(callee) {
		return callee.Text() == "setTimeout"
	}
	if !ast.IsPropertyAccessExpression(callee) || calleeName(callee) != "setTimeout" {
		return false
	}
	object := unwrap(callee.Expression())
	return ast.IsIdentifier(object) && (object.Text() == "globalThis" || object.Text() == "window")
}

func callsResolve(callback *ast.Node, resolve string) bool {
	callback = unwrap(callback)
	if ast.IsIdentifier(callback) {
		return callback.Text() == resolve
	}
	if !ast.IsArrowFunction(callback) && !ast.IsFunctionExpression(callback) {
		return false
	}
	call := soleResult(callback)
	if call == nil || !ast.IsCallExpression(call) {
		return false
	}
	callee := unwrap(call.AsCallExpression().Expression)
	return ast.IsIdentifier(callee) && callee.Text() == resolve
}

// runsOnLiveClock reports whether the nearest runner around an Effect uses the real clock.
func runsOnLiveClock(ctx rule.RuleContext, node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if !ast.IsCallExpression(current) {
			continue
		}
		callee := current.AsCallExpression().Expression
		if members, root := effectTestMembers(callee); root != nil && isEffectVitestIt(ctx, root) {
			for _, member := range members {
				if member == "live" || strings.HasSuffix(member, "Live") {
					return true
				}
			}
			return false
		}
		name := effectMemberName(ctx, callee)
		if effectRunners[name] || name == "withLive" {
			return true
		}
		if calleeName(unwrap(callee)) == "pipe" {
			for _, argument := range current.Arguments() {
				if effectRunners[effectMemberName(ctx, argument)] {
					return true
				}
			}
		}
	}
	return false
}

func calleeName(callee *ast.Node) string {
	if ast.IsIdentifier(callee) {
		return callee.Text()
	}
	if ast.IsPropertyAccessExpression(callee) && callee.AsPropertyAccessExpression().Name() != nil {
		return callee.AsPropertyAccessExpression().Name().Text()
	}
	return ""
}
