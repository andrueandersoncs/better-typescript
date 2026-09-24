package semanticlint

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSemanticQuestionsRejectInapplicableCodeShapes(t *testing.T) {
	rule := testRule(t, "example", "Review applicable code.")
	for name, instructions := range map[string]string{
		"whole file": questionForRule(rule).Instructions,
		"window":     questionForWindowRule(rule).Instructions,
	} {
		t.Run(name, func(t *testing.T) {
			if !strings.Contains(instructions, "the rule's subject is absent") ||
				!strings.Contains(instructions, "the rule does not apply to the code shape shown") {
				t.Fatalf("question does not reject inapplicable code shapes:\n%s", instructions)
			}
		})
	}
}

func TestIssue13PolicyRequestsCarryNegativeAndPositiveCases(t *testing.T) {
	rules := embeddedRulesByPath(t)
	for testIndex, test := range issue13PolicyCases() {
		t.Run(test.name, func(t *testing.T) {
			rule, ok := rules[test.path]
			if !ok {
				t.Fatalf("missing embedded policy %s", test.path)
			}
			fixtures := append([]string{test.negativeFixture}, test.positiveFixtures...)
			for sourceIndex, fixture := range fixtures {
				text := readIssue13Fixture(t, fixture)
				marker := fmt.Sprintf("// issue13-%d-%d", testIndex, sourceIndex)
				text = marker + "\n" + text
				path := "src/" + fixture
				wholeSource := Source{Path: path, Text: text}
				windowSource := Source{Path: path, Text: text + strings.Repeat("// surrounding context\n", 100)}
				windowLimit := requestSize(singleRuleRequest("", rule, defaultModel, true)) + 80
				for _, requestCase := range []struct {
					name     string
					source   Source
					limit    int
					windowed bool
				}{
					{name: "whole file", source: wholeSource, limit: maximumRequestBytes},
					{name: "window", source: windowSource, limit: windowLimit, windowed: true},
				} {
					t.Run(fixture+"/"+requestCase.name, func(t *testing.T) {
						partitions, err := buildRequestPartitions(requestCase.source, []Rule{rule}, defaultModel, requestCase.limit)
						if err != nil {
							t.Fatal(err)
						}
						if len(partitions) == 0 {
							t.Fatal("no request partitions")
						}
						markerSeen := false
						for _, partition := range partitions {
							if partition.windowed != requestCase.windowed {
								t.Fatalf("windowed = %t, want %t", partition.windowed, requestCase.windowed)
							}
							fragment := partition.request.State["file"]
							if fragment == "" || !strings.Contains(requestCase.source.Text, fragment) {
								t.Fatalf("request fragment is not from the source: %q", fragment)
							}
							markerSeen = markerSeen || strings.Contains(fragment, marker)
							instructions := partition.request.Questions[rule.ID].Instructions
							for _, required := range []string{test.notViolation, test.violation} {
								if !strings.Contains(instructions, required) {
									t.Errorf("%s does not contain %q", test.path, required)
								}
							}
						}
						if !markerSeen {
							t.Fatalf("issue-shaped marker %q was absent from every partition", marker)
						}
					})
				}
			}
		})
	}
}

func TestIssue13KeepsReadabilityPoliciesSelected(t *testing.T) {
	rules, err := loadRules("", "")
	if err != nil {
		t.Fatal(err)
	}
	selected := rulesForPath(rules, nil, "src/text.ts")
	paths := make(map[string]bool, len(selected))
	for _, rule := range selected {
		paths[rule.Path] = true
	}
	for _, path := range []string{
		"rules/effect/separate-service-interfaces-from-layer-construction.md",
		"rules/readability/give-each-function-one-coherent-responsibility.md",
	} {
		if !paths[path] {
			t.Errorf("src/text.ts no longer selects %s", path)
		}
	}
}

type issue13PolicyCase struct {
	name             string
	path             string
	negativeFixture  string
	positiveFixtures []string
	notViolation     string
	violation        string
}

func issue13PolicyCases() []issue13PolicyCase {
	return []issue13PolicyCase{
		{
			name:             "provider I/O is not an Effect service",
			path:             "rules/effect/separate-service-interfaces-from-layer-construction.md",
			negativeFixture:  "provider-io.ts",
			positiveFixtures: []string{"effect-service-direct.ts"},
			notViolation:     "Do not report ordinary provider I/O when the file has no Effect service abstraction and constructs no Layer.",
			violation:        "Report an Effect service implementation that is coupled directly to its vendor or database client instead of being constructed through a Layer.",
		},
		{
			name:             "pure check result is not an Effect failure",
			path:             "rules/effect-errors.md",
			negativeFixture:  "pure-check.ts",
			positiveFixtures: []string{"effectful-throw.ts", "application/user-repository.ts"},
			notViolation:     "Do not report a deterministic function such as `verifyOutcome` that returns domain or check results without performing an effect or exposing an operational failure.",
			violation:        "Report an effectful application operation below those boundaries when it throws, performs the effect outside `Effect`, or erases an expected failure from the typed error channel.",
		},
		{
			name:             "pure check result has no Effect error channel",
			path:             "rules/effect/model-expected-failures-with-specific-types.md",
			negativeFixture:  "pure-check.ts",
			positiveFixtures: []string{"unspecific-effect-error.ts"},
			notViolation:     "Do not report deterministic calculations that return domain or check outcomes without an Effect error channel.",
			violation:        "Report an expected failure in an Effect workflow when it uses an unspecific error type, is swallowed, or is converted into a defect merely to simplify a signature.",
		},
		{
			name:             "request-local builder is not observable state",
			path:             "rules/mutability.md",
			negativeFixture:  "local-builder.ts",
			positiveFixtures: []string{"shared-mutation.ts"},
			notViolation:     "Do not report mutation confined to a non-escaping request-local builder.",
			violation:        "Report mutation that escapes the builder, changes shared state, mutates an input parameter, or exposes mutable state in the returned value.",
		},
	}
}

func readIssue13Fixture(t *testing.T, name string) string {
	t.Helper()
	content, err := os.ReadFile(filepath.Join("testdata", "issue13", name))
	if err != nil {
		t.Fatal(err)
	}
	return string(content)
}

func embeddedRulesByPath(t *testing.T) map[string]Rule {
	t.Helper()
	rules, err := loadRules("", "")
	if err != nil {
		t.Fatal(err)
	}
	byPath := make(map[string]Rule, len(rules))
	for _, rule := range rules {
		byPath[rule.Path] = rule
	}
	return byPath
}
