package utils

import (
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/core"
	"github.com/andrueandersoncs/typescript-go/scanner"
)

func TrimNodeTextRange(sourceFile *ast.SourceFile, node *ast.Node) core.TextRange {
	return scanner.GetRangeOfTokenAtPosition(sourceFile, node.Pos()).WithEnd(node.End())
}
