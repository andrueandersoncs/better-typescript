package unbounded_stream_buffer

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", UnboundedStreamBufferRule, []analysis.Violation{
		{RuleName: "unbounded-stream-buffer", Level: "error", Message: "Avoid unbounded Stream buffers. Use natural backpressure or a bounded buffer strategy.", FilePath: "violation.ts", Line: 3, Column: 1},
	})
}
