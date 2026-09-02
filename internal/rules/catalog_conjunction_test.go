package rules

import (
	"path/filepath"
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/rules/duplicate_shape"
	"github.com/andrueandersoncs/better-typescript/internal/rules/no_property_access_after_call"
	"github.com/andrueandersoncs/better-typescript/internal/rules/no_value_aliases"
	"github.com/andrueandersoncs/better-typescript/internal/rules/prefer_effect_schema_constructor"
	"github.com/andrueandersoncs/better-typescript/internal/rules/prefer_effect_schema_record"
	"github.com/andrueandersoncs/better-typescript/internal/rules/redundant_alias"
	"github.com/andrueandersoncs/better-typescript/internal/rules/schema_record_interface"
	"github.com/andrueandersoncs/better-typescript/internal/rules/unused_field"
)

func TestSchemaRecordConjunction(t *testing.T) {
	root, err := filepath.Abs("testdata/schema_record_mapper")
	if err != nil {
		t.Fatal(err)
	}
	violations, err := analysis.Run(root, []rule.Rule{
		duplicate_shape.Rule,
		no_property_access_after_call.Rule,
		no_value_aliases.Rule,
		prefer_effect_schema_constructor.Rule,
		prefer_effect_schema_record.Rule,
		redundant_alias.Rule,
		schema_record_interface.Rule,
		unused_field.UnusedFieldRule,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(violations) != 0 {
		t.Fatalf("violations = %#v, want none", violations)
	}
}
