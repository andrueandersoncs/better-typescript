package compiler

import (
	"context"

	"github.com/microsoft/typescript-go/internal/ast"
	"github.com/microsoft/typescript-go/internal/checker"
	"github.com/microsoft/typescript-go/internal/compiler"
	_ "unsafe"
)

//go:linkname Program_GetSemanticDiagnosticsWithChecker github.com/microsoft/typescript-go/internal/compiler.(*Program).getSemanticDiagnosticsWithChecker
func Program_GetSemanticDiagnosticsWithChecker(program *compiler.Program, ctx context.Context, fileChecker *checker.Checker, sourceFile *ast.SourceFile) []*ast.Diagnostic
