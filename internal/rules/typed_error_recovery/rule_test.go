package typed_error_recovery

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", TypedErrorRecoveryRule, []analysis.Violation{
		{RuleName: "typed-error-recovery", Level: "error", Message: "Use typed error recovery instead of broad cause recovery. Use catchIf, catchTag, catchFilter, or retry for expected typed failures.", FilePath: "violation.ts", Line: 4, Column: 1},
	})
}
