package unbounded_stream_collect

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", UnboundedStreamCollectRule, []analysis.Violation{
		{RuleName: "unbounded-stream-collect", Level: "error", Message: "Avoid collecting an unbounded production Stream. Consume the stream incrementally with runForEach, runDrain, or a bounded take.", FilePath: "violation.ts", Line: 3, Column: 1},
	})
}
