package schema_class_models

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "schema-class-models", Level: "error", Message: "Avoid Schema class data models; use Schema.Struct or tagged schema variants. Keep ordinary data declarative and decode it at the boundary.", FilePath: "index.ts", Line: 2, Column: 1},
	})
}
