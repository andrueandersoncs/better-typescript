package analysis

import (
	"reflect"
	"slices"
	"testing"
)

func TestCompareViolationsSortsAllFieldsBeforeExactDeduplication(t *testing.T) {
	first := Violation{RuleName: "rule-a", Level: "error", Message: "message-a", FilePath: "a.ts", Line: 1, Column: 1}
	input := []Violation{
		{RuleName: "rule-a", Level: "error", Message: "message-a", FilePath: "b.ts", Line: 1, Column: 1},
		{RuleName: "rule-a", Level: "error", Message: "message-a", FilePath: "a.ts", Line: 2, Column: 1},
		{RuleName: "rule-a", Level: "error", Message: "message-a", FilePath: "a.ts", Line: 1, Column: 2},
		{RuleName: "rule-b", Level: "error", Message: "message-a", FilePath: "a.ts", Line: 1, Column: 1},
		{RuleName: "rule-a", Level: "warning", Message: "message-a", FilePath: "a.ts", Line: 1, Column: 1},
		{RuleName: "rule-a", Level: "error", Message: "message-b", FilePath: "a.ts", Line: 1, Column: 1},
		first,
		first,
	}

	slices.SortFunc(input, compareViolations)
	got := slices.Compact(input)
	want := []Violation{
		first,
		{RuleName: "rule-a", Level: "error", Message: "message-b", FilePath: "a.ts", Line: 1, Column: 1},
		{RuleName: "rule-a", Level: "warning", Message: "message-a", FilePath: "a.ts", Line: 1, Column: 1},
		{RuleName: "rule-b", Level: "error", Message: "message-a", FilePath: "a.ts", Line: 1, Column: 1},
		{RuleName: "rule-a", Level: "error", Message: "message-a", FilePath: "a.ts", Line: 1, Column: 2},
		{RuleName: "rule-a", Level: "error", Message: "message-a", FilePath: "a.ts", Line: 2, Column: 1},
		{RuleName: "rule-a", Level: "error", Message: "message-a", FilePath: "b.ts", Line: 1, Column: 1},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("violations = %#v, want %#v", got, want)
	}
}
