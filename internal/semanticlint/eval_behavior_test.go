package semanticlint

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestEvalCorpusIsValid(t *testing.T) {
	rules, err := loadRules(t.TempDir(), "")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := loadEvalCorpus(evalDirectory, rules); err != nil {
		t.Fatal(err)
	}
}

func TestCheckVariantRejectsLongMalformedOrCorpusQuotingPrompts(t *testing.T) {
	rules, err := loadRules(t.TempDir(), "")
	if err != nil {
		t.Fatal(err)
	}
	cases, err := loadEvalCorpus(evalDirectory, rules)
	if err != nil {
		t.Fatal(err)
	}
	content, err := os.ReadFile(filepath.Join(evalDirectory, "files/security/hide-database-details/pair-1-complies.ts"))
	if err != nil {
		t.Fatal(err)
	}
	corpusRun := strings.Join(strings.FieldsFunc(string(content), isNotWordRune)[:8], " ")
	for _, test := range []struct {
		name     string
		change   func(*prompts)
		accepted bool
	}{
		{"default prompts", func(*prompts) {}, true},
		{"general Effect API", func(p *prompts) { p.Final += " Treat `Effect.gen` bodies as ordinary code." }, true},
		{"policy title", func(p *prompts) { p.Final += " Remember: " + rules[0].Title + "." }, false},
		{"8-word corpus run", func(p *prompts) { p.Final += " " + corpusRun }, false},
		{"corpus string literal", func(p *prompts) { p.Final += " A message like “Could not load invoice” is generic." }, false},
		{"corpus member expression", func(p *prompts) { p.Final += " `context.authorization !== undefined` reveals presence only." }, false},
		{"corpus type name", func(p *prompts) { p.Final += " Passing a `QueryFailure` along is not evidence." }, false},
		{"five times the default length", func(p *prompts) { p.Candidate = strings.Repeat(p.Candidate, 5) }, false},
		{"evidence prompt without its block", func(p *prompts) { p.Evidence = "Is this block relevant to `policy`?" }, false},
	} {
		t.Run(test.name, func(t *testing.T) {
			variant := defaultPrompts
			test.change(&variant)
			if err := checkVariant(evalDirectory, cases, rules, variant); (err == nil) != test.accepted {
				t.Fatalf("accepted = %v, want %v (%v)", err == nil, test.accepted, err)
			}
		})
	}
}

func TestEvalScoreCreditsOnlyLocalizedReportedViolations(t *testing.T) {
	high, low := 0.9, 0.2
	for _, test := range []struct {
		name        string
		label       string
		probability *float64
		localized   bool
		want        float64
	}{
		{"localized violation", "violates", &high, true, 0.99},
		{"violation cited with wrong evidence", "violates", &high, false, 0},
		{"inconclusive on a violation", "violates", nil, false, 0},
		{"low probability on compliant code", "complies", &low, false, 0.96},
		{"inconclusive on inapplicable code", "not-applicable", nil, false, 1},
	} {
		t.Run(test.name, func(t *testing.T) {
			if _, got := evalScore(test.label, test.probability, test.localized); got < test.want-1e-9 || got > test.want+1e-9 {
				t.Fatalf("score = %v, want %v", got, test.want)
			}
		})
	}
}

func TestPlantPartsInsertsWholePartsAtTopLevelBoundaries(t *testing.T) {
	host := "import { a } from \"a\"\n\nexport function f() {\n\n  return a\n}\n\nexport const b = 1\n"
	text, gold := plantParts(host, []plantedText{{text: "const x = 1\n", at: 0.5}, {text: "const y = 2", at: 1}})
	want := "import { a } from \"a\"\n\nconst x = 1\n\nexport function f() {\n\n  return a\n}\n\nexport const b = 1\n\nconst y = 2\n\n"
	if text != want {
		t.Fatalf("planted text:\n%s", text)
	}
	if !reflect.DeepEqual(gold, []evalLines{{3, 3}, {12, 12}}) {
		t.Fatalf("gold = %v", gold)
	}
	lines := strings.Split(text, "\n")
	if lines[gold[0][0]-1] != "const x = 1" || lines[gold[1][0]-1] != "const y = 2" {
		t.Fatalf("gold lines do not hold the parts: %v", gold)
	}
}

func TestCompareEvalReportsRequiresConfidentImprovement(t *testing.T) {
	report := func(violating, complying float64) evalCasesReport {
		hit := true
		var cases []evalCaseResult
		for index := range 40 {
			result := evalCaseResult{ID: string(rune('a'+index%26)) + strings.Repeat("x", index/26), Label: "complies", Effective: complying, Outcome: "pass"}
			if index%2 == 0 {
				result.Label, result.Effective, result.Outcome = "violates", violating, "violation"
				result.CandidateHit, result.Localized = &hit, &hit
			}
			expected := 0.0
			if result.Label == "violates" {
				expected = 1
			}
			result.Score = 1 - (expected-result.Effective)*(expected-result.Effective)
			result.Efficiency.InputTokens = 100
			cases = append(cases, result)
		}
		return evalCasesReport{Model: evalModel, Corpus: "sha256:corpus", Cases: cases}
	}
	baseline := []evalCasesReport{report(0.5, 0.5), report(0.5, 0.5)}
	improved, err := compareEvalReports(baseline, []evalCasesReport{report(0.9, 0.1)})
	if err != nil || improved.Verdict != "better" {
		t.Fatalf("improved verdict = %q, %v", improved.Verdict, err)
	}
	repeated, err := compareEvalReports(baseline, baseline)
	if err != nil || repeated.Verdict != "no-change" {
		t.Fatalf("repeated verdict = %q, %v", repeated.Verdict, err)
	}
	regressed, err := compareEvalReports(baseline, []evalCasesReport{report(0.5, 0.9)})
	if err != nil || regressed.Verdict != "worse" {
		t.Fatalf("regressed verdict = %q, %v", regressed.Verdict, err)
	}
	other := report(0.9, 0.1)
	other.Corpus = "sha256:other"
	if _, err := compareEvalReports(baseline, []evalCasesReport{other}); err == nil {
		t.Fatal("compared reports over different corpora")
	}
	mixed := report(0.9, 0.1)
	mixed.Variant = "sha256:other"
	if _, err := compareEvalReports([]evalCasesReport{report(0.5, 0.5), mixed}, baseline); err == nil {
		t.Fatal("averaged runs of different variants")
	}
}
