package streaming_textdecoder

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "streaming-textdecoder", Level: "error", Message: "Preserve TextDecoder state while decoding arbitrary byte-stream chunks. Keep one decoder for the stream and call decoder.decode(chunk, { stream: true }) for each chunk.", FilePath: "violation.ts", Line: 7, Column: 157},
		{RuleName: "streaming-textdecoder", Level: "error", Message: "Preserve TextDecoder state while decoding arbitrary byte-stream chunks. Keep one decoder for the stream and call decoder.decode(chunk, { stream: true }) for each chunk.", FilePath: "violation.ts", Line: 12, Column: 157},
		{RuleName: "streaming-textdecoder", Level: "error", Message: "Preserve TextDecoder state while decoding arbitrary byte-stream chunks. Keep one decoder for the stream and call decoder.decode(chunk, { stream: true }) for each chunk.", FilePath: "violation.ts", Line: 17, Column: 147},
	})
}
