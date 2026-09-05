package unbounded_stream_buffer

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", UnboundedStreamBufferRule, []analysis.Violation{
		{RuleName: "unbounded-stream-buffer", Level: "error", Message: "Avoid unbounded Effect Stream or Channel buffers. Use a finite capacity. Stream.buffer counts elements; bufferArray counts chunks. Use suspend to preserve backpressure—dropping and sliding lose data.", FilePath: "violation.ts", Line: 5, Column: 1},
		{RuleName: "unbounded-stream-buffer", Level: "error", Message: "Avoid unbounded Effect Stream or Channel buffers. Use a finite capacity. Stream.buffer counts elements; bufferArray counts chunks. Use suspend to preserve backpressure—dropping and sliding lose data.", FilePath: "violation.ts", Line: 6, Column: 1},
		{RuleName: "unbounded-stream-buffer", Level: "error", Message: "Avoid unbounded Effect Stream or Channel buffers. Use a finite capacity. Stream.buffer counts elements; bufferArray counts chunks. Use suspend to preserve backpressure—dropping and sliding lose data.", FilePath: "violation.ts", Line: 7, Column: 1},
		{RuleName: "unbounded-stream-buffer", Level: "error", Message: "Avoid unbounded Effect Stream or Channel buffers. Use a finite capacity. Stream.buffer counts elements; bufferArray counts chunks. Use suspend to preserve backpressure—dropping and sliding lose data.", FilePath: "violation.ts", Line: 8, Column: 1},
		{RuleName: "unbounded-stream-buffer", Level: "error", Message: "Avoid unbounded Effect Stream or Channel buffers. Use a finite capacity. Stream.buffer counts elements; bufferArray counts chunks. Use suspend to preserve backpressure—dropping and sliding lose data.", FilePath: "violation.ts", Line: 9, Column: 1},
		{RuleName: "unbounded-stream-buffer", Level: "error", Message: "Avoid unbounded Effect Stream or Channel buffers. Use a finite capacity. Stream.buffer counts elements; bufferArray counts chunks. Use suspend to preserve backpressure—dropping and sliding lose data.", FilePath: "violation.ts", Line: 11, Column: 1},
	})
}
