package rule

import (
	"sync"

	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
	"github.com/andrueandersoncs/typescript-go/compiler"
	"github.com/andrueandersoncs/typescript-go/core"
)

const (
	lastTokenKind                        ast.Kind = 1000
	lastOnExitTokenKind                  ast.Kind = 2000
	lastOnAllowPatternTokenKind          ast.Kind = 3000
	lastOnAllowPatternOnExitTokenKind    ast.Kind = 4000
	lastOnNotAllowPatternTokenKind       ast.Kind = 5000
	lastOnNotAllowPatternOnExitTokenKind ast.Kind = 6000
)

func ListenerOnExit(kind ast.Kind) ast.Kind {
	return kind + 1000
}

// TODO(port): better name
func ListenerOnAllowPattern(kind ast.Kind) ast.Kind {
	return kind + lastOnExitTokenKind
}
func ListenerOnNotAllowPattern(kind ast.Kind) ast.Kind {
	return kind + lastOnAllowPatternOnExitTokenKind
}

type RuleListeners map[ast.Kind](func(node *ast.Node))

type Rule struct {
	Name string
	Run  func(ctx RuleContext, options any) RuleListeners
}

type RuleMessage struct {
	Id          string
	Description string
	Help        string
}

type RuleDiagnostic struct {
	Range      core.TextRange
	RuleName   string
	Message    RuleMessage
	SourceFile *ast.SourceFile
}

type ProgramCache struct {
	entries sync.Map
}

type programCacheEntry[T any] struct {
	once  sync.Once
	value T
}

func NewProgramCache() *ProgramCache {
	return &ProgramCache{}
}

func ProgramCacheValue[T any](ctx RuleContext, key any, build func() T) T {
	if ctx.ProgramCache == nil {
		return build()
	}
	loaded, _ := ctx.ProgramCache.entries.LoadOrStore(key, &programCacheEntry[T]{})
	entry := loaded.(*programCacheEntry[T])
	entry.once.Do(func() {
		entry.value = build()
	})
	return entry.value
}

type RuleContext struct {
	SourceFile       *ast.SourceFile
	Program          *compiler.Program
	ProgramCache     *ProgramCache
	TypeChecker      *checker.Checker
	ReportDiagnostic func(diagnostic RuleDiagnostic)
	ReportRange      func(textRange core.TextRange, msg RuleMessage)
	ReportNode       func(node *ast.Node, msg RuleMessage)
}
