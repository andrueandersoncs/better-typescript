package linter

import (
	"sync"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"

	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
	"github.com/andrueandersoncs/typescript-go/compiler"
	"github.com/andrueandersoncs/typescript-go/core"
)

type ConfiguredRule struct {
	Name string
	Run  func(ctx rule.RuleContext) rule.RuleListeners
}

type checkerWorkload struct {
	checker *checker.Checker
	program *compiler.Program
	queue   chan *ast.SourceFile
}

type RunLinterOnProgramOptions struct {
	Program         *compiler.Program
	Files           []*ast.SourceFile
	Workers         int
	GetRulesForFile func(sourceFile *ast.SourceFile) []ConfiguredRule
	OnDiagnostic    func(diagnostic rule.RuleDiagnostic)
}

// ruleContextBuilder provides the RuleContext reporting methods.
// It creates three report closures per worker instead of per rule.
type ruleContextBuilder struct {
	file         *ast.SourceFile
	ruleName     string
	onDiagnostic func(rule.RuleDiagnostic)
}

// Calls `onDiagnostic` with the given diagnostic's information, but sets the
// rule name and source file to match the file and rule currently being run.
func (b *ruleContextBuilder) emitDiagnostic(d rule.RuleDiagnostic) {
	d.RuleName = b.ruleName
	d.SourceFile = b.file
	b.onDiagnostic(d)
}

func (b *ruleContextBuilder) reportRange(textRange core.TextRange, msg rule.RuleMessage) {
	b.emitDiagnostic(rule.RuleDiagnostic{
		Range:   textRange,
		Message: msg,
	})
}

func (b *ruleContextBuilder) reportNode(node *ast.Node, msg rule.RuleMessage) {
	b.emitDiagnostic(rule.RuleDiagnostic{
		Range:   utils.TrimNodeTextRange(b.file, node),
		Message: msg,
	})
}

func newRuleContext(ctxBuilder *ruleContextBuilder) rule.RuleContext {
	return rule.RuleContext{
		ReportDiagnostic: ctxBuilder.emitDiagnostic,
		ReportRange:      ctxBuilder.reportRange,
		ReportNode:       ctxBuilder.reportNode,
	}
}

func makeSourceFileQueue(files []*ast.SourceFile) chan *ast.SourceFile {
	queue := make(chan *ast.SourceFile, len(files))
	for _, file := range files {
		queue <- file
	}
	close(queue)
	return queue
}

func makeCheckerWorkloadQueue(program *compiler.Program, files []*ast.SourceFile) chan checkerWorkload {
	queue := makeSourceFileQueue(files)
	flatQueue := []checkerWorkload{}
	var flatQueueMu sync.Mutex
	program.ForEachCheckerParallel(func(idx int, ch *checker.Checker) {
		flatQueueMu.Lock()
		flatQueue = append(flatQueue, checkerWorkload{ch, program, queue})
		flatQueueMu.Unlock()
	})

	workloadQueue := make(chan checkerWorkload, len(flatQueue))
	for _, w := range flatQueue {
		workloadQueue <- w
	}
	close(workloadQueue)
	return workloadQueue
}

func visitLintNodes(file *ast.SourceFile, runListeners func(kind ast.Kind, node *ast.Node)) {
	/* convert.ts -> allowPattern:
	catch name
	variabledeclaration name
	forinstatement initializer
	forofstatement initializer
	(propagation) allowPattern > arrayliteralexpression elements
	(propagation) allowPattern > objectliteralexpression properties
	(propagation) allowPattern > spreadassignment,spreadelement expression
	(propagation) allowPattern > propertyassignment value
	arraybindingpattern elements
	objectbindingpattern elements
	(init) binaryexpression(with '=' operator') left
	*/

	var childVisitor ast.Visitor
	var patternVisitor func(node *ast.Node)
	patternVisitor = func(node *ast.Node) {
		runListeners(node.Kind, node)
		kind := rule.ListenerOnAllowPattern(node.Kind)
		runListeners(kind, node)

		switch node.Kind {
		case ast.KindArrayLiteralExpression:
			for _, element := range node.AsArrayLiteralExpression().Elements.Nodes {
				patternVisitor(element)
			}
		case ast.KindObjectLiteralExpression:
			for _, property := range node.AsObjectLiteralExpression().Properties.Nodes {
				patternVisitor(property)
			}
		case ast.KindSpreadElement, ast.KindSpreadAssignment:
			patternVisitor(node.Expression())
		case ast.KindPropertyAssignment:
			patternVisitor(node.Initializer())
		default:
			node.ForEachChild(childVisitor)
		}

		runListeners(rule.ListenerOnExit(kind), node)
		runListeners(rule.ListenerOnExit(node.Kind), node)
	}
	childVisitor = func(node *ast.Node) bool {
		runListeners(node.Kind, node)

		switch node.Kind {
		case ast.KindArrayLiteralExpression, ast.KindObjectLiteralExpression:
			kind := rule.ListenerOnNotAllowPattern(node.Kind)
			runListeners(kind, node)
			node.ForEachChild(childVisitor)
			runListeners(rule.ListenerOnExit(kind), node)
		default:
			if ast.IsAssignmentExpression(node, true) {
				expr := node.AsBinaryExpression()
				patternVisitor(expr.Left)
				childVisitor(expr.OperatorToken)
				childVisitor(expr.Right)
			} else {
				node.ForEachChild(childVisitor)
			}
		}

		runListeners(rule.ListenerOnExit(node.Kind), node)

		return false
	}
	file.Node.ForEachChild(childVisitor)
}

func RunLinterOnProgram(options RunLinterOnProgramOptions) error {
	program := options.Program
	files := options.Files
	workers := options.Workers
	getRulesForFile := options.GetRulesForFile
	onDiagnostic := options.OnDiagnostic

	workloadQueue := makeCheckerWorkloadQueue(program, files)
	programCache := rule.NewProgramCache()

	wg := core.NewWorkGroup(workers == 1)
	for range workers {
		wg.Queue(func() {
			ctxBuilder := &ruleContextBuilder{
				onDiagnostic: onDiagnostic,
			}

			// These closures remain valid for the length of linting, as we mutate the fields
			// of `ctxBuilder`, but `ctxBuilder` itself will not change.
			ctx := newRuleContext(ctxBuilder)
			ctx.ProgramCache = programCache

			// Listeners are tagged with the rule that is associated with, so that when a diagnostic
			// is emitted we know what rule it is coming from.
			type taggedListener struct {
				ruleName string
				fn       func(node *ast.Node)
			}
			registeredListeners := make(map[ast.Kind][]taggedListener, 20)

			for w := range workloadQueue {
				ctx.Program = w.program
				ctx.TypeChecker = w.checker

				for file := range w.queue {
					ctxBuilder.file = file
					ctx.SourceFile = file

					rules := getRulesForFile(file)
					for _, r := range rules {
						ctxBuilder.ruleName = r.Name
						for kind, listener := range r.Run(ctx) {
							listeners, ok := registeredListeners[kind]
							if !ok {
								listeners = make([]taggedListener, 0, len(rules))
							}
							registeredListeners[kind] = append(listeners, taggedListener{ruleName: r.Name, fn: listener})
						}
					}

					runListeners := func(kind ast.Kind, node *ast.Node) {
						if listeners, ok := registeredListeners[kind]; ok {
							for _, listener := range listeners {
								ctxBuilder.ruleName = listener.ruleName
								listener.fn(node)
							}
						}
					}

					visitLintNodes(file, runListeners)
					// Instead of clearing the map, we clear the slices in-place to avoid re-allocating memory for the listeners on each file.
					for k := range registeredListeners {
						registeredListeners[k] = registeredListeners[k][:0]
					}
				}
			}
		})
	}
	wg.RunAndWait()

	return nil
}
