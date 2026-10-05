package semanticlint

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"math"
	"math/rand/v2"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode"
)

const (
	evalDirectory              = "testdata/evals"
	evalModel                  = "jev-1.13.0"
	evalCaseConcurrency        = 4
	evalBootstrapSamples       = 4_000
	stageOracle          stage = "oracle"
)

var (
	evalLabels    = map[string]bool{"violates": true, "complies": true, "not-applicable": true, "ambiguous": true}
	evalOrigins   = map[string]bool{"contrast": true, "planted": true, "real": true, "regression": true}
	evalSplits    = map[string]bool{"train": true, "val": true, "test": true}
	evalLeakWords = []string{"violat", "complian", "fixme"}
)

// evalLines is a 1-based inclusive line range.
type evalLines [2]int

// evalCase is one file, one policy, and its gold label.
type evalCase struct {
	ID        string            `json:"id"`
	Policy    string            `json:"policy"`
	Path      string            `json:"path"`
	File      string            `json:"file,omitempty"`
	Plant     *evalPlant        `json:"plant,omitempty"`
	Label     string            `json:"label"`
	GoldLines []evalLines       `json:"goldLines,omitempty"`
	GoldAny   bool              `json:"goldAny,omitempty"`
	Origin    string            `json:"origin"`
	Pair      string            `json:"pair,omitempty"`
	Split     string            `json:"split"`
	Labels    map[string]string `json:"labels"`
}

// evalPlant inserts snippet files into a real host file; the inserted lines are the gold lines.
type evalPlant struct {
	Host  string     `json:"host"`
	Parts []evalPart `json:"parts"`
}

type evalPart struct {
	File string  `json:"file"`
	At   float64 `json:"at"`
}

type plantedText struct {
	text string
	at   float64
}

func policyIndex(rules []Rule) map[string]Rule {
	policies := make(map[string]Rule, len(rules))
	for _, rule := range rules {
		policies[semanticRuleSelector(rule.Path)] = rule
	}
	return policies
}

func loadEvalCorpus(directory string, rules []Rule) ([]evalCase, error) {
	var cases []evalCase
	err := filepath.WalkDir(filepath.Join(directory, "cases"), func(path string, entry fs.DirEntry, err error) error {
		if err != nil || entry.IsDir() || filepath.Ext(path) != ".jsonl" {
			return err
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		for number, line := range strings.Split(strings.TrimSuffix(string(content), "\n"), "\n") {
			decoder := json.NewDecoder(strings.NewReader(line))
			decoder.DisallowUnknownFields()
			var item evalCase
			if err := decoder.Decode(&item); err != nil {
				return fmt.Errorf("%s:%d: %w", path, number+1, err)
			}
			cases = append(cases, item)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	if len(cases) == 0 {
		return nil, fmt.Errorf("no eval cases under %s", directory)
	}
	sort.Slice(cases, func(i, j int) bool { return cases[i].ID < cases[j].ID })
	return cases, validateEvalCorpus(directory, cases, policyIndex(rules))
}

func validateEvalCorpus(directory string, cases []evalCase, policies map[string]Rule) error {
	var problems []error
	report := func(item evalCase, format string, args ...any) {
		problems = append(problems, fmt.Errorf("%s: %s", item.ID, fmt.Sprintf(format, args...)))
	}
	byID := make(map[string]evalCase, len(cases))
	for _, item := range cases {
		if _, duplicate := byID[item.ID]; duplicate {
			report(item, "duplicate id")
		}
		byID[item.ID] = item
		if rule, ok := policies[item.Policy]; !ok {
			report(item, "unknown policy %s", item.Policy)
		} else if !rule.matchesPath(item.Path) {
			report(item, "path %s does not match the policy globs", item.Path)
		}
		if !strings.HasPrefix(item.ID, item.Policy+"/") {
			report(item, "id must start with the policy")
		}
		if !evalLabels[item.Label] || !evalOrigins[item.Origin] || !evalSplits[item.Split] {
			report(item, "invalid label %q, origin %q, or split %q", item.Label, item.Origin, item.Split)
		}
		if item.GoldAny && len(item.GoldLines) < 2 {
			report(item, "goldAny needs several gold ranges")
		}
		if len(item.Labels) == 0 {
			report(item, "labels are required")
		}
		if (item.File == "") == (item.Plant == nil) {
			report(item, "exactly one of file and plant is required")
		}
		if (item.Origin == "planted") != (item.Plant != nil) {
			report(item, "plant is required exactly for planted cases")
		}
		if item.Plant != nil && (item.Label != "violates" || len(item.GoldLines) > 0 || len(item.Plant.Parts) == 0) {
			report(item, "planted cases need parts, violate, and compute their gold lines")
		}
		if item.Plant == nil && (item.Label == "violates" || item.Origin == "contrast" && item.Label == "complies") && len(item.GoldLines) == 0 {
			report(item, "gold lines are required")
		}
		if item.Origin == "contrast" && (item.Label == "violates" || item.Label == "complies") && item.Pair == "" {
			report(item, "contrast cases need a pair")
		}
		source, gold, err := caseSource(directory, item)
		if err != nil {
			report(item, "%v", err)
			continue
		}
		lines := len(lineStarts(source.Text))
		for _, span := range gold {
			if span[0] < 1 || span[0] > span[1] || span[1] > lines {
				report(item, "gold lines %d-%d outside 1-%d", span[0], span[1], lines)
			}
		}
		for _, text := range authoredTexts(directory, item) {
			for _, word := range evalLeakWords {
				if strings.Contains(strings.ToLower(text), word) {
					report(item, "authored text or path contains %q", word)
				}
			}
		}
	}
	for _, item := range cases {
		if item.Pair == "" {
			continue
		}
		partner, ok := byID[item.Pair]
		labels := map[string]bool{item.Label: true, partner.Label: true}
		switch {
		case !ok:
			report(item, "pair %s does not exist", item.Pair)
		case partner.Pair != item.ID:
			report(item, "pair %s does not point back", item.Pair)
		case partner.Split != item.Split || partner.Policy != item.Policy || partner.Path != item.Path:
			report(item, "pair %s differs in split, policy, or path", item.Pair)
		case !labels["ambiguous"] && !(labels["violates"] && labels["complies"]):
			report(item, "pair must be one violating and one complying case")
		}
	}
	return errors.Join(problems...)
}

// authoredTexts returns the corpus-authored content of a case: its path and every non-host file.
func authoredTexts(directory string, item evalCase) []string {
	texts := []string{item.Path}
	files := []string{item.File}
	if item.Plant != nil {
		for _, part := range item.Plant.Parts {
			files = append(files, part.File)
		}
	}
	for _, file := range files {
		if !strings.HasPrefix(file, "files/") {
			continue
		}
		if content, err := os.ReadFile(filepath.Join(directory, filepath.FromSlash(file))); err == nil {
			texts = append(texts, string(content))
		}
	}
	return texts
}

func caseSource(directory string, item evalCase) (Source, []evalLines, error) {
	read := func(file string) (string, error) {
		content, err := os.ReadFile(filepath.Join(directory, filepath.FromSlash(file)))
		return string(content), err
	}
	if item.Plant == nil {
		text, err := read(item.File)
		return Source{Path: item.Path, Text: text}, item.GoldLines, err
	}
	host, err := read(item.Plant.Host)
	if err != nil {
		return Source{}, nil, err
	}
	parts := make([]plantedText, len(item.Plant.Parts))
	for index, part := range item.Plant.Parts {
		if parts[index].text, err = read(part.File); err != nil {
			return Source{}, nil, err
		}
		parts[index].at = part.At
	}
	text, gold := plantParts(host, parts)
	return Source{Path: item.Path, Text: text}, gold, nil
}

// plantParts inserts each part at the top-level boundary nearest its fraction of the host and
// returns the composed text with each part's line range, in part order.
func plantParts(host string, parts []plantedText) (string, []evalLines) {
	lines := strings.SplitAfter(host, "\n")
	if lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	} else {
		lines[len(lines)-1] += "\n"
	}
	order := make([]int, len(parts))
	positions := make([]int, len(parts))
	for index, part := range parts {
		order[index] = index
		positions[index] = topLevelBoundary(lines, part.at)
	}
	sort.SliceStable(order, func(i, j int) bool { return positions[order[i]] < positions[order[j]] })
	var output strings.Builder
	gold := make([]evalLines, len(parts))
	written, next, previousBlank := 0, 0, true
	for _, index := range order {
		for ; next < positions[index]; next++ {
			output.WriteString(lines[next])
			written++
			previousBlank = strings.TrimSpace(lines[next]) == ""
		}
		if !previousBlank {
			output.WriteString("\n")
			written++
		}
		text := parts[index].text
		if !strings.HasSuffix(text, "\n") {
			text += "\n"
		}
		output.WriteString(text)
		gold[index] = evalLines{written + 1, written + strings.Count(text, "\n")}
		written = gold[index][1]
		output.WriteString("\n")
		written++
		previousBlank = true
	}
	for ; next < len(lines); next++ {
		output.WriteString(lines[next])
	}
	return output.String(), gold
}

func topLevelBoundary(lines []string, at float64) int {
	target := int(math.Round(at * float64(len(lines))))
	for distance := 0; distance <= len(lines); distance++ {
		for _, line := range []int{target + distance, target - distance} {
			if line >= 0 && line <= len(lines) && isTopLevelBoundary(lines, line) {
				return line
			}
		}
	}
	return len(lines)
}

func isTopLevelBoundary(lines []string, line int) bool {
	if line == 0 || line == len(lines) {
		return true
	}
	next := lines[line]
	return strings.TrimSpace(lines[line-1]) == "" && strings.TrimSpace(next) != "" &&
		!unicode.IsSpace(rune(next[0])) && !strings.ContainsRune("})]", rune(next[0]))
}

// lineStarts returns the byte offset where each line begins.
func lineStarts(text string) []int {
	starts := []int{0}
	for index := 0; index < len(text); index++ {
		if text[index] == '\n' && index+1 < len(text) {
			starts = append(starts, index+1)
		}
	}
	return starts
}

func lineAt(starts []int, offset int) int {
	return sort.Search(len(starts), func(index int) bool { return starts[index] > offset })
}

func windowLines(starts []int, window sourceWindow) evalLines {
	return evalLines{lineAt(starts, window.start), lineAt(starts, max(window.start, window.end-1))}
}

func linesWindow(text string, starts []int, lines evalLines) sourceWindow {
	end := len(text)
	if lines[1] < len(starts) {
		end = starts[lines[1]]
	}
	return sourceWindow{start: starts[lines[0]-1], end: end}
}

func linesOverlap(left, right evalLines) bool {
	return left[0] <= right[1] && right[0] <= left[1]
}

// coversGold reports whether the given ranges overlap every gold range, or any one when anyOf is set.
func coversGold(gold, ranges []evalLines, anyOf bool) bool {
	covered := 0
	for _, span := range gold {
		for _, candidate := range ranges {
			if linesOverlap(span, candidate) {
				covered++
				break
			}
		}
	}
	return covered > 0 && (anyOf || covered == len(gold))
}

func formatLines(ranges []evalLines) string {
	if len(ranges) == 0 {
		return "none"
	}
	parts := make([]string, len(ranges))
	for index, span := range ranges {
		parts[index] = fmt.Sprintf("%d-%d", span[0], span[1])
	}
	return "lines " + strings.Join(parts, ", ")
}

// evalScore is 1 − (y − p)². p is the reported violation probability; it is 0 when the tool
// reports none, or when a reported violation cites evidence that misses a gold range.
func evalScore(label string, probability *float64, localized bool) (float64, float64) {
	effective := 0.0
	if probability != nil && (label != "violates" || localized) {
		effective = *probability
	}
	expected := 0.0
	if label == "violates" {
		expected = 1
	}
	return effective, 1 - (expected-effective)*(expected-effective)
}

// evalTraceEntry is one request issued during a case and the response it received.
type evalTraceEntry struct {
	request  evaluationRequest
	response evaluationResponse
	bytes    int
	cached   bool
}

// tracingEvaluator records every request and replays responses from cache when present.
type tracingEvaluator struct {
	next    evaluator
	cache   string
	mu      sync.Mutex
	entries []evalTraceEntry
}

func (tracer *tracingEvaluator) Evaluate(ctx context.Context, request evaluationRequest) (evaluationResponse, error) {
	body, err := marshalJSON(request)
	if err != nil {
		return evaluationResponse{}, err
	}
	digest := sha256.Sum256(body)
	path := ""
	if tracer.cache != "" {
		path = filepath.Join(tracer.cache, hex.EncodeToString(digest[:])+".json")
	}
	var response evaluationResponse
	cached := false
	if path != "" {
		if content, err := os.ReadFile(path); err == nil {
			if err := json.Unmarshal(content, &response); err != nil {
				return evaluationResponse{}, fmt.Errorf("read replay cache %s: %w", path, err)
			}
			cached = true
		} else if !errors.Is(err, fs.ErrNotExist) {
			return evaluationResponse{}, err
		}
	}
	if !cached {
		if tracer.next == nil {
			return evaluationResponse{}, fmt.Errorf("replay cache miss and TYPESAFE_API_KEY is unset")
		}
		if response, err = tracer.next.Evaluate(ctx, request); err != nil {
			return evaluationResponse{}, err
		}
		if path != "" {
			if err := writeFileAtomically(path, response); err != nil {
				return evaluationResponse{}, err
			}
		}
	}
	tracer.mu.Lock()
	tracer.entries = append(tracer.entries, evalTraceEntry{request: request, response: response, bytes: len(body), cached: cached})
	tracer.mu.Unlock()
	return response, nil
}

func writeFileAtomically(path string, value any) error {
	content, err := marshalJSON(value)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	temporary, err := os.CreateTemp(filepath.Dir(path), ".tmp-*")
	if err != nil {
		return err
	}
	if _, err := temporary.Write(content); err != nil {
		temporary.Close()
		os.Remove(temporary.Name())
		return err
	}
	if err := temporary.Close(); err != nil {
		os.Remove(temporary.Name())
		return err
	}
	return os.Rename(temporary.Name(), path)
}

type evalStageUsage struct {
	InputTokens  int `json:"inputTokens"`
	Requests     int `json:"requests"`
	Questions    int `json:"questions"`
	RequestBytes int `json:"requestBytes"`
}

// evalEfficiency is the production cost of one evaluation. In totals, Rounds is the maximum.
type evalEfficiency struct {
	InputTokens      int                      `json:"inputTokens"`
	Requests         int                      `json:"requests"`
	RequestBytes     int                      `json:"requestBytes"`
	CachedRequests   int                      `json:"cachedRequests"`
	Rounds           int                      `json:"rounds"`
	WallMilliseconds int64                    `json:"wallMilliseconds"`
	ByStage          map[stage]evalStageUsage `json:"byStage"`
}

func measureEfficiency(entries []evalTraceEntry, wall time.Duration) evalEfficiency {
	efficiency := evalEfficiency{WallMilliseconds: wall.Milliseconds(), ByStage: map[stage]evalStageUsage{}}
	rounds := map[int]bool{}
	for _, entry := range entries {
		usage := efficiency.ByStage[entry.request.scope.stage]
		usage.InputTokens += entry.response.Usage.InputTokens
		usage.Requests++
		usage.Questions += len(entry.request.Questions)
		usage.RequestBytes += entry.bytes
		efficiency.ByStage[entry.request.scope.stage] = usage
		efficiency.InputTokens += entry.response.Usage.InputTokens
		efficiency.Requests++
		efficiency.RequestBytes += entry.bytes
		if entry.cached {
			efficiency.CachedRequests++
		}
		rounds[entry.request.scope.round] = true
	}
	efficiency.Rounds = len(rounds)
	return efficiency
}

func sumEfficiency(items []evalEfficiency) evalEfficiency {
	total := evalEfficiency{ByStage: map[stage]evalStageUsage{}}
	for _, item := range items {
		total.InputTokens += item.InputTokens
		total.Requests += item.Requests
		total.RequestBytes += item.RequestBytes
		total.CachedRequests += item.CachedRequests
		total.Rounds = max(total.Rounds, item.Rounds)
		total.WallMilliseconds += item.WallMilliseconds
		for step, usage := range item.ByStage {
			sum := total.ByStage[step]
			sum.InputTokens += usage.InputTokens
			sum.Requests += usage.Requests
			sum.Questions += usage.Questions
			sum.RequestBytes += usage.RequestBytes
			total.ByStage[step] = sum
		}
	}
	return total
}

type evalOracle struct {
	Violation     float64 `json:"violation"`
	Applicability float64 `json:"applicability"`
	InputTokens   int     `json:"inputTokens"`
}

type evalCaseResult struct {
	ID            string            `json:"id"`
	Policy        string            `json:"policy"`
	Label         string            `json:"label"`
	Origin        string            `json:"origin"`
	Split         string            `json:"split"`
	Pair          string            `json:"pair,omitempty"`
	Outcome       string            `json:"outcome,omitempty"`
	Reason        string            `json:"reason,omitempty"`
	Probability   *float64          `json:"probability,omitempty"`
	Applicability *float64          `json:"applicability,omitempty"`
	GoldLines     []evalLines       `json:"goldLines,omitempty"`
	EvidenceLines []evalLines       `json:"evidenceLines,omitempty"`
	CandidateHit  *bool             `json:"candidateHit,omitempty"`
	Localized     *bool             `json:"localized,omitempty"`
	Effective     float64           `json:"effective"`
	Score         float64           `json:"score"`
	Oracle        *evalOracle       `json:"oracle,omitempty"`
	ReturnedModel string            `json:"returnedModel,omitempty"`
	Efficiency    evalEfficiency    `json:"efficiency"`
	Feedback      map[string]string `json:"feedback,omitempty"`
	Error         string            `json:"error,omitempty"`
}

type evalCasesReport struct {
	Kind              string              `json:"kind"`
	Model             string              `json:"model"`
	ReturnedModels    []string            `json:"returnedModels"`
	Corpus            string              `json:"corpus"`
	Variant           string              `json:"variant"`
	Prompts           prompts             `json:"prompts"`
	Split             string              `json:"split"`
	Packed            bool                `json:"packed"`
	Accuracy          map[string]*float64 `json:"accuracy"`
	Errors            int                 `json:"errors"`
	Efficiency        evalEfficiency      `json:"efficiency"`
	OracleInputTokens int                 `json:"oracleInputTokens"`
	Cases             []evalCaseResult    `json:"cases"`
}

// evalRun evaluates cases with one model, prompt variant, and evaluator.
type evalRun struct {
	directory string
	rules     []Rule
	options   Options
	packed    bool
	next      evaluator
	cache     string
}

func (run evalRun) runCases(ctx context.Context, cases []evalCase, split string) (evalCasesReport, error) {
	settings := run.options.requestSettings()
	variant, err := evalDigest(settings.prompts)
	if err != nil {
		return evalCasesReport{}, err
	}
	corpus, err := corpusDigest(run.directory, cases)
	if err != nil {
		return evalCasesReport{}, err
	}
	results := make([]evalCaseResult, len(cases))
	policies := policyIndex(run.rules)
	jobs := make(chan int)
	var workers sync.WaitGroup
	for range min(evalCaseConcurrency, len(cases)) {
		workers.Add(1)
		go func() {
			defer workers.Done()
			for index := range jobs {
				results[index] = run.runCase(ctx, cases[index], policies)
			}
		}()
	}
	for index := range cases {
		jobs <- index
	}
	close(jobs)
	workers.Wait()

	report := evalCasesReport{
		Kind: "semantic-eval-cases", Model: settings.model, Corpus: corpus, Variant: variant,
		Prompts: settings.prompts, Split: split, Packed: run.packed, Cases: results,
		Accuracy: map[string]*float64{},
	}
	var scored []evalCaseResult
	var efficiencies []evalEfficiency
	models := map[string]bool{}
	for _, result := range results {
		efficiencies = append(efficiencies, result.Efficiency)
		if result.Oracle != nil {
			report.OracleInputTokens += result.Oracle.InputTokens
		}
		if result.ReturnedModel != "" && !models[result.ReturnedModel] {
			models[result.ReturnedModel] = true
			report.ReturnedModels = append(report.ReturnedModels, result.ReturnedModel)
		}
		if result.Error != "" {
			report.Errors++
			continue
		}
		scored = append(scored, result)
	}
	sort.Strings(report.ReturnedModels)
	report.Efficiency = sumEfficiency(efficiencies)
	for _, metric := range evalMetrics {
		if value, ok := metric.value(scored); ok {
			report.Accuracy[metric.name] = &value
		} else {
			report.Accuracy[metric.name] = nil
		}
	}
	return report, nil
}

func (run evalRun) runCase(ctx context.Context, item evalCase, policies map[string]Rule) evalCaseResult {
	result := evalCaseResult{ID: item.ID, Policy: item.Policy, Label: item.Label, Origin: item.Origin, Split: item.Split, Pair: item.Pair}
	source, gold, err := caseSource(run.directory, item)
	if err != nil {
		result.Error = err.Error()
		return result
	}
	result.GoldLines = gold
	target := policies[item.Policy]
	rules := []Rule{target}
	if run.packed {
		rules = rulesForPath(run.rules, nil, item.Path)
	}
	tracer := &tracingEvaluator{next: run.next, cache: run.cache}
	started := time.Now()
	report, err := evaluateSource(ctx, source, rules, run.options, tracer)
	result.Efficiency = measureEfficiency(tracer.entries, time.Since(started))
	if err != nil {
		result.Error = err.Error()
		return result
	}
	result.ReturnedModel = report.Model
	var finding Finding
	for _, candidate := range report.Findings {
		if candidate.RulePath == target.Path {
			finding = candidate
		}
	}
	starts := lineStarts(source.Text)
	result.Outcome, result.Reason = finding.Classification, finding.Reason
	result.Probability, result.Applicability = finding.ViolationProbability, finding.ApplicabilityProbability
	for _, candidate := range finding.CandidateRanges {
		result.EvidenceLines = append(result.EvidenceLines, evalLines{candidate.StartLine, candidate.EndLine})
	}
	selected := selectedCandidates(tracer.entries, target, starts)
	localized := coversGold(gold, result.EvidenceLines, item.GoldAny)
	if item.Label == "violates" {
		candidateHit := coversGold(gold, selected, item.GoldAny)
		result.CandidateHit, result.Localized = &candidateHit, &localized
	}
	result.Effective, result.Score = evalScore(item.Label, result.Probability, localized)
	if result.Oracle, err = run.oracle(ctx, source, target, gold); err != nil {
		result.Error = err.Error()
		return result
	}
	result.Feedback = caseFeedback(item, source, target, result, tracer.entries)
	return result
}

// selectedCandidates returns the candidate spans the target policy selected, as line ranges.
func selectedCandidates(entries []evalTraceEntry, target Rule, starts []int) []evalLines {
	var selected []evalLines
	for _, entry := range entries {
		answer, ok := entry.response.Answers[target.ID]
		if entry.request.scope.stage == stageCandidate && ok && answer.Noul > candidateSelectionThreshold {
			selected = append(selected, windowLines(starts, entry.request.scope.window))
		}
	}
	return selected
}

// oracle asks the final questions on gold lines alone, or on the whole file when no lines are gold.
func (run evalRun) oracle(ctx context.Context, source Source, target Rule, gold []evalLines) (*evalOracle, error) {
	starts := lineStarts(source.Text)
	windows := []sourceWindow{{start: 0, end: len(source.Text)}}
	if len(gold) > 0 {
		sorted := append([]evalLines(nil), gold...)
		sort.Slice(sorted, func(i, j int) bool { return sorted[i][0] < sorted[j][0] })
		windows = nil
		for _, span := range sorted {
			windows = mergeCandidate(windows, linesWindow(source.Text, starts, span))
		}
	}
	request := finalRequest(source, target, windows, candidateRanges(source, windows), run.options.requestSettings())
	if requestSize(request) > maximumRequestBytes {
		return nil, nil
	}
	request.scope = requestScope{stage: stageOracle}
	tracer := &tracingEvaluator{next: run.next, cache: run.cache}
	response, err := tracer.Evaluate(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("oracle: %w", err)
	}
	violation, err := probabilityForRule(response, target)
	if err != nil {
		return nil, err
	}
	applicability, err := probabilityForRule(response, Rule{ID: target.ID + "_applies", Path: target.Path})
	if err != nil {
		return nil, err
	}
	return &evalOracle{Violation: violation, Applicability: applicability, InputTokens: response.Usage.InputTokens}, nil
}

// caseFeedback explains each component's contribution to one case for GEPA's reflection model.
func caseFeedback(item evalCase, source Source, target Rule, result evalCaseResult, entries []evalTraceEntry) map[string]string {
	starts := lineStarts(source.Text)
	gold := formatLines(result.GoldLines)
	type scoredSpan struct {
		lines evalLines
		score float64
	}
	var spans []scoredSpan
	for _, entry := range entries {
		if answer, ok := entry.response.Answers[target.ID]; ok && entry.request.scope.stage == stageCandidate {
			spans = append(spans, scoredSpan{windowLines(starts, entry.request.scope.window), answer.Noul})
		}
	}
	sort.Slice(spans, func(i, j int) bool { return spans[i].lines[0] < spans[j].lines[0] })
	describe := func(include func(scoredSpan) bool) string {
		var parts []string
		for _, span := range spans {
			if include(span) {
				parts = append(parts, fmt.Sprintf("lines %d-%d scored %.2f", span.lines[0], span.lines[1], span.score))
			}
		}
		if len(parts) == 0 {
			return "none"
		}
		return strings.Join(parts, "; ")
	}
	selected := func(span scoredSpan) bool { return span.score > candidateSelectionThreshold }
	feedback := map[string]string{}
	violates := item.Label == "violates"
	switch {
	case violates && *result.CandidateHit:
		feedback["candidate"] = fmt.Sprintf("Label violates; gold %s. Selected spans: %s.", gold, describe(selected))
	case violates:
		feedback["candidate"] = fmt.Sprintf("Label violates; gold %s. Spans covering gold: %s. Selection needs > %.2f, so the policy was never judged on the gold lines.", gold,
			describe(func(span scoredSpan) bool { return coversAny(result.GoldLines, span.lines) }), candidateSelectionThreshold)
	default:
		feedback["candidate"] = fmt.Sprintf("Label %s. Selected spans: %s. Each selected span costs search and final requests.", item.Label, describe(selected))
	}

	evidence := formatLines(result.EvidenceLines)
	switch {
	case violates && !*result.CandidateHit:
		feedback["evidence"] = "Not reached: candidate selection dropped the gold lines."
	case violates && *result.Localized:
		feedback["evidence"] = fmt.Sprintf("Kept gold %s; final evidence %s.", gold, evidence)
	case violates:
		var dropped []string
		for _, entry := range entries {
			if entry.request.scope.stage != stageEvidence {
				continue
			}
			for position, block := range entry.request.scope.blocks {
				lines := windowLines(starts, block)
				if score := entry.response.Answers[blockKey(position)].Noul; coversAny(result.GoldLines, lines) && score <= candidateSelectionThreshold {
					dropped = append(dropped, fmt.Sprintf("lines %d-%d scored %.2f", lines[0], lines[1], score))
				}
			}
		}
		feedback["evidence"] = fmt.Sprintf("Dropped gold %s; final evidence %s. Gold blocks at or below %.2f: %s.", gold, evidence, candidateSelectionThreshold, strings.Join(dropped, "; "))
	default:
		feedback["evidence"] = fmt.Sprintf("Label %s; final evidence %s.", item.Label, evidence)
	}

	final := fmt.Sprintf("Label %s; outcome %s", item.Label, result.Outcome)
	if result.Probability != nil {
		final += fmt.Sprintf(" with violation probability %.2f", *result.Probability)
	}
	if result.Reason != "" {
		final += " (" + result.Reason + ")"
	}
	final += fmt.Sprintf(" on evidence %s.", evidence)
	if result.Oracle != nil {
		final += fmt.Sprintf(" On gold %s alone: violation %.2f.", gold, result.Oracle.Violation)
	}
	feedback["final"] = final

	applicable := item.Label != "not-applicable"
	switch {
	case result.Reason == applicabilityGateReason && applicable:
		feedback["applicability"] = fmt.Sprintf("Policy subject is present (label %s), but applicability %.2f < %.2f hid the finding.", item.Label, *result.Applicability, minimumApplicabilityProbability)
	case result.Applicability != nil && !applicable && *result.Applicability >= minimumApplicabilityProbability:
		feedback["applicability"] = fmt.Sprintf("Policy subject is absent (label not-applicable), but applicability is %.2f.", *result.Applicability)
	case result.Applicability != nil:
		feedback["applicability"] = fmt.Sprintf("Label %s; applicability %.2f.", item.Label, *result.Applicability)
	case result.Oracle != nil:
		feedback["applicability"] = fmt.Sprintf("Label %s; no final judgment ran; applicability on gold alone %.2f.", item.Label, result.Oracle.Applicability)
	default:
		feedback["applicability"] = fmt.Sprintf("Label %s; no final judgment ran.", item.Label)
	}
	return feedback
}

func coversAny(gold []evalLines, span evalLines) bool {
	for _, candidate := range gold {
		if linesOverlap(candidate, span) {
			return true
		}
	}
	return false
}

// evalMaximumPromptGrowth caps each variant prompt at this multiple of its default length. Prompts
// repeat in every question, so length is cost.
const evalMaximumPromptGrowth = 4

var (
	corpusStringPattern = regexp.MustCompile(`"([^"\\\n]+)"|'([^'\\\n]+)'`)
	codeNamePattern     = regexp.MustCompile(`[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+|\b[a-z][a-z0-9]*(?:[A-Z][a-z0-9]+)+\b|\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\b`)
)

// checkVariant rejects a prompt variant that is malformed, much longer than the defaults, or quotes
// the corpus.
func checkVariant(directory string, cases []evalCase, rules []Rule, variant prompts) error {
	if !strings.Contains(variant.Evidence, blockPlaceholder) {
		return fmt.Errorf("evidence prompt must name its block with %s", blockPlaceholder)
	}
	fields, err := promptFields(variant)
	if err != nil {
		return err
	}
	defaults, err := promptFields(defaultPrompts)
	if err != nil {
		return err
	}
	for name, value := range fields {
		if limit := evalMaximumPromptGrowth * len(defaults[name]); len(value) > limit {
			return fmt.Errorf("prompt %s is %d bytes; the limit is %d (%d× the default)", name, len(value), limit, evalMaximumPromptGrowth)
		}
	}
	return checkVariantLeak(directory, cases, rules, fields)
}

func promptFields(value prompts) (map[string]string, error) {
	content, err := marshalJSON(value)
	if err != nil {
		return nil, err
	}
	var fields map[string]string
	return fields, json.Unmarshal(content, &fields)
}

// checkVariantLeak rejects prompts that quote a policy title, any 8-word run of corpus-authored text,
// a multi-word corpus string literal, or a compound or dotted code name found only in authored cases.
// Names that also occur in policies, default prompts, or real host files count as general.
func checkVariantLeak(directory string, cases []evalCase, rules []Rule, fields map[string]string) error {
	var values, words []string
	for _, value := range fields {
		values = append(values, value)
		words = append(words, strings.FieldsFunc(strings.ToLower(value), isNotWordRune)...)
		words = append(words, "|")
	}
	text := strings.Join(values, "\n")
	normalized := strings.Join(words, " ")
	for _, rule := range rules {
		if title := strings.Join(strings.FieldsFunc(strings.ToLower(rule.Title), isNotWordRune), " "); strings.Contains(normalized, title) {
			return fmt.Errorf("variant quotes policy title %q", rule.Title)
		}
	}
	var authored, general strings.Builder
	runs := map[string]bool{}
	for _, item := range cases {
		for _, content := range authoredTexts(directory, item)[1:] {
			authored.WriteString(content)
			corpusWords := strings.FieldsFunc(strings.ToLower(content), isNotWordRune)
			for start := 0; start+8 <= len(corpusWords); start++ {
				runs[strings.Join(corpusWords[start:start+8], " ")] = true
			}
		}
	}
	for start := 0; start+8 <= len(words); start++ {
		if run := strings.Join(words[start:start+8], " "); runs[run] {
			return fmt.Errorf("variant quotes corpus text %q", run)
		}
	}
	lower := strings.ToLower(text)
	for _, match := range corpusStringPattern.FindAllStringSubmatch(authored.String(), -1) {
		if literal := match[1] + match[2]; len(literal) >= 8 && strings.Contains(literal, " ") && strings.Contains(lower, strings.ToLower(literal)) {
			return fmt.Errorf("variant quotes corpus string %q", literal)
		}
	}
	for _, rule := range rules {
		general.WriteString(rule.Source)
	}
	defaults, err := promptFields(defaultPrompts)
	if err != nil {
		return err
	}
	for _, value := range defaults {
		general.WriteString(value)
	}
	hosts, err := filepath.Glob(filepath.Join(directory, "hosts", "*"))
	if err != nil {
		return err
	}
	for _, host := range hosts {
		content, err := os.ReadFile(host)
		if err != nil {
			return err
		}
		general.Write(content)
	}
	for _, name := range codeNamePattern.FindAllString(text, -1) {
		if strings.Contains(authored.String(), name) && !strings.Contains(general.String(), name) {
			return fmt.Errorf("variant names corpus identifier %q", name)
		}
	}
	return nil
}

func isNotWordRune(value rune) bool {
	return !unicode.IsLetter(value) && !unicode.IsDigit(value)
}

func evalDigest(value any) (string, error) {
	content, err := marshalJSON(value)
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256(content)
	return "sha256:" + hex.EncodeToString(digest[:]), nil
}

// corpusDigest identifies the selected cases and the exact source text each one evaluates.
func corpusDigest(directory string, cases []evalCase) (string, error) {
	hash := sha256.New()
	for _, item := range cases {
		record, err := marshalJSON(item)
		if err != nil {
			return "", err
		}
		source, _, err := caseSource(directory, item)
		if err != nil {
			return "", err
		}
		fmt.Fprintf(hash, "%s\x00%s\x00%s\x00", record, source.Path, source.Text)
	}
	return "sha256:" + hex.EncodeToString(hash.Sum(nil)), nil
}

// evalMetric is one accuracy measure over scored cases; ok is false when it is undefined.
type evalMetric struct {
	name   string
	higher bool
	value  func([]evalCaseResult) (float64, bool)
}

var evalMetrics = []evalMetric{
	{"score", true, func(results []evalCaseResult) (float64, bool) {
		return mean(results, func(result evalCaseResult) (float64, bool) { return result.Score, true })
	}},
	{"violationPrecision", true, func(results []evalCaseResult) (float64, bool) {
		return fraction(results, func(result evalCaseResult) bool { return result.Outcome == "violation" },
			func(result evalCaseResult) bool { return result.Label == "violates" })
	}},
	{"surfaceRecall", true, func(results []evalCaseResult) (float64, bool) {
		return fraction(results, isViolating, func(result evalCaseResult) bool {
			return result.Outcome == "violation" || result.Outcome == "review"
		})
	}},
	{"silentMissRate", false, func(results []evalCaseResult) (float64, bool) {
		return fraction(results, isViolating, func(result evalCaseResult) bool { return result.Outcome == "inconclusive" })
	}},
	{"pairAccuracy", true, pairAccuracy},
	{"auroc", true, func(results []evalCaseResult) (float64, bool) {
		return auroc(results, func(result evalCaseResult) (float64, bool, bool) {
			return result.Effective, result.Label == "violates", true
		})
	}},
	{"candidateRecall", true, func(results []evalCaseResult) (float64, bool) {
		return fraction(results, isViolating, func(result evalCaseResult) bool { return *result.CandidateHit })
	}},
	{"evidenceRecall", true, func(results []evalCaseResult) (float64, bool) {
		return fraction(results, isViolating, func(result evalCaseResult) bool { return *result.Localized })
	}},
	{"oracleAuroc", true, func(results []evalCaseResult) (float64, bool) {
		return auroc(results, func(result evalCaseResult) (float64, bool, bool) {
			if result.Oracle == nil {
				return 0, false, false
			}
			return result.Oracle.Violation, result.Label == "violates", true
		})
	}},
	{"oracleBrier", false, func(results []evalCaseResult) (float64, bool) {
		return mean(results, func(result evalCaseResult) (float64, bool) {
			if result.Oracle == nil {
				return 0, false
			}
			expected := 0.0
			if result.Label == "violates" {
				expected = 1
			}
			return (expected - result.Oracle.Violation) * (expected - result.Oracle.Violation), true
		})
	}},
	{"applicabilityAuroc", true, func(results []evalCaseResult) (float64, bool) {
		return auroc(results, func(result evalCaseResult) (float64, bool, bool) {
			if result.Oracle == nil {
				return 0, false, false
			}
			return result.Oracle.Applicability, result.Label != "not-applicable", true
		})
	}},
	{"gatedApplicableRate", false, func(results []evalCaseResult) (float64, bool) {
		return fraction(results, func(result evalCaseResult) bool { return result.Label != "not-applicable" },
			func(result evalCaseResult) bool { return result.Reason == applicabilityGateReason })
	}},
}

func isViolating(result evalCaseResult) bool { return result.Label == "violates" }

func mean(results []evalCaseResult, value func(evalCaseResult) (float64, bool)) (float64, bool) {
	total, count := 0.0, 0
	for _, result := range results {
		if item, ok := value(result); ok {
			total += item
			count++
		}
	}
	return total / float64(max(count, 1)), count > 0
}

func fraction(results []evalCaseResult, include, hit func(evalCaseResult) bool) (float64, bool) {
	hits, count := 0, 0
	for _, result := range results {
		if include(result) {
			count++
			if hit(result) {
				hits++
			}
		}
	}
	return float64(hits) / float64(max(count, 1)), count > 0
}

// pairAccuracy is the share of contrast pairs whose violating member scores above its fix.
func pairAccuracy(results []evalCaseResult) (float64, bool) {
	effective := make(map[string]float64, len(results))
	for _, result := range results {
		effective[result.ID] = result.Effective
	}
	total, count := 0.0, 0
	for _, result := range results {
		partner, ok := effective[result.Pair]
		if result.Label != "violates" || !ok {
			continue
		}
		count++
		switch {
		case result.Effective > partner:
			total++
		case result.Effective == partner:
			total += 0.5
		}
	}
	return total / float64(max(count, 1)), count > 0
}

// auroc is the probability that a random positive outranks a random negative, ties counting half.
func auroc(results []evalCaseResult, value func(evalCaseResult) (score float64, positive, ok bool)) (float64, bool) {
	type point struct {
		score    float64
		positive bool
	}
	var points []point
	positives := 0
	for _, result := range results {
		if score, positive, ok := value(result); ok {
			points = append(points, point{score, positive})
			if positive {
				positives++
			}
		}
	}
	negatives := len(points) - positives
	if positives == 0 || negatives == 0 {
		return 0, false
	}
	sort.Slice(points, func(i, j int) bool { return points[i].score < points[j].score })
	rankSum := 0.0
	for start := 0; start < len(points); {
		end := start
		for end < len(points) && points[end].score == points[start].score {
			end++
		}
		rank := float64(start+end+1) / 2
		for _, item := range points[start:end] {
			if item.positive {
				rankSum += rank
			}
		}
		start = end
	}
	return (rankSum - float64(positives*(positives+1))/2) / float64(positives*negatives), true
}

type evalMetricDelta struct {
	Name        string   `json:"name"`
	Baseline    *float64 `json:"baseline"`
	Candidate   *float64 `json:"candidate"`
	Improvement *float64 `json:"improvement"`
	Low         *float64 `json:"low"`
	High        *float64 `json:"high"`
	Level       float64  `json:"level"`
	Verdict     string   `json:"verdict"`
}

type evalComparison struct {
	Kind             string            `json:"kind"`
	Model            string            `json:"model"`
	Corpus           string            `json:"corpus"`
	BaselineVariant  string            `json:"baselineVariant"`
	CandidateVariant string            `json:"candidateVariant"`
	BaselineRuns     int               `json:"baselineRuns"`
	CandidateRuns    int               `json:"candidateRuns"`
	Cases            int               `json:"cases"`
	Excluded         int               `json:"excluded"`
	Flips            int               `json:"flips"`
	Metrics          []evalMetricDelta `json:"metrics"`
	Verdict          string            `json:"verdict"`
}

type comparedMetric struct {
	name        string
	value       func([]evalCaseResult) (float64, bool)
	improvement func(baseline, candidate float64) (float64, bool)
}

func comparedMetrics() []comparedMetric {
	metrics := make([]comparedMetric, 0, len(evalMetrics)+1)
	for _, metric := range evalMetrics {
		higher := metric.higher
		metrics = append(metrics, comparedMetric{metric.name, metric.value, func(baseline, candidate float64) (float64, bool) {
			if higher {
				return candidate - baseline, true
			}
			return baseline - candidate, true
		}})
	}
	tokens := func(results []evalCaseResult) (float64, bool) {
		total := 0
		for _, result := range results {
			total += result.Efficiency.InputTokens
		}
		return float64(total), total > 0
	}
	return append(metrics, comparedMetric{"efficiency", tokens, func(baseline, candidate float64) (float64, bool) {
		return math.Log2(baseline / candidate), baseline > 0 && candidate > 0
	}})
}

// compareEvalReports pairs cases by ID across repeated runs of each side, averages each metric over a
// side's runs, and bootstraps the improvement over cases (positive is better). Flips counts cases
// whose outcome is not identical in every run.
func compareEvalReports(baselines, candidates []evalCasesReport) (evalComparison, error) {
	if len(baselines) == 0 || len(candidates) == 0 {
		return evalComparison{}, fmt.Errorf("each side needs at least one report")
	}
	reports := append(append([]evalCasesReport(nil), baselines...), candidates...)
	for _, report := range reports {
		if report.Model != reports[0].Model || report.Corpus != reports[0].Corpus {
			return evalComparison{}, fmt.Errorf("reports differ in model or corpus; refusing to compare")
		}
	}
	for _, side := range [][]evalCasesReport{baselines, candidates} {
		for _, report := range side {
			if report.Variant != side[0].Variant {
				return evalComparison{}, fmt.Errorf("runs on one side differ in variant")
			}
		}
	}
	comparison := evalComparison{Kind: "semantic-eval-comparison", Model: reports[0].Model, Corpus: reports[0].Corpus,
		BaselineVariant: baselines[0].Variant, CandidateVariant: candidates[0].Variant,
		BaselineRuns: len(baselines), CandidateRuns: len(candidates)}
	byRun := make([]map[string]evalCaseResult, len(reports))
	for run, report := range reports {
		byRun[run] = make(map[string]evalCaseResult, len(report.Cases))
		for _, result := range report.Cases {
			byRun[run][result.ID] = result
		}
	}
	var ids []string
	for _, result := range reports[0].Cases {
		shared := true
		for _, run := range byRun {
			other, ok := run[result.ID]
			shared = shared && ok && other.Error == ""
		}
		if !shared {
			comparison.Excluded++
			continue
		}
		ids = append(ids, result.ID)
		for _, run := range byRun[1:] {
			if run[result.ID].Outcome != result.Outcome {
				comparison.Flips++
				break
			}
		}
	}
	comparison.Cases = len(ids)
	if comparison.Cases == 0 {
		return evalComparison{}, fmt.Errorf("reports share no successful cases")
	}
	aligned := make([][]evalCaseResult, len(reports))
	sampled := make([][]evalCaseResult, len(reports))
	for run := range reports {
		aligned[run], sampled[run] = make([]evalCaseResult, len(ids)), make([]evalCaseResult, len(ids))
		for index, id := range ids {
			aligned[run][index] = byRun[run][id]
		}
	}
	split := len(baselines)
	metrics := comparedMetrics()
	samples := make([][]float64, len(metrics))
	random := rand.New(rand.NewPCG(1, 2))
	for range evalBootstrapSamples {
		for index := range ids {
			pick := random.IntN(len(ids))
			for run := range aligned {
				sampled[run][index] = aligned[run][pick]
			}
		}
		for index, metric := range metrics {
			if value, ok := metricImprovement(metric, sampled[:split], sampled[split:]); ok {
				samples[index] = append(samples[index], value)
			}
		}
	}
	worse, better := false, false
	for index, metric := range metrics {
		// Objectives use a 95% interval; the many gates use 99% so noise alone rarely trips one.
		primary := metric.name == "score" || metric.name == "efficiency"
		delta := evalMetricDelta{Name: metric.name, Level: 0.99, Verdict: "undefined"}
		if primary {
			delta.Level = 0.95
		}
		if value, ok := averageMetric(metric, aligned[:split]); ok {
			delta.Baseline = &value
		}
		if value, ok := averageMetric(metric, aligned[split:]); ok {
			delta.Candidate = &value
		}
		if value, ok := metricImprovement(metric, aligned[:split], aligned[split:]); ok {
			delta.Improvement = &value
		}
		if count := len(samples[index]); count >= evalBootstrapSamples/2 {
			sort.Float64s(samples[index])
			tail := (1 - delta.Level) / 2
			low, high := samples[index][int(tail*float64(count))], samples[index][int((1-tail)*float64(count))-1]
			delta.Low, delta.High = &low, &high
			switch {
			case low > 0:
				delta.Verdict = "better"
			case high < 0:
				delta.Verdict = "worse"
			default:
				delta.Verdict = "no-change"
			}
		}
		worse = worse || delta.Verdict == "worse"
		better = better || delta.Verdict == "better" && primary
		comparison.Metrics = append(comparison.Metrics, delta)
	}
	switch {
	case worse:
		comparison.Verdict = "worse"
	case better:
		comparison.Verdict = "better"
	default:
		comparison.Verdict = "no-change"
	}
	return comparison, nil
}

// averageMetric is the metric's mean over runs; it is undefined when any run leaves it undefined.
func averageMetric(metric comparedMetric, runs [][]evalCaseResult) (float64, bool) {
	total := 0.0
	for _, run := range runs {
		value, ok := metric.value(run)
		if !ok {
			return 0, false
		}
		total += value
	}
	return total / float64(len(runs)), true
}

func metricImprovement(metric comparedMetric, before, after [][]evalCaseResult) (float64, bool) {
	baseline, baselineOK := averageMetric(metric, before)
	candidate, candidateOK := averageMetric(metric, after)
	if !baselineOK || !candidateOK {
		return 0, false
	}
	return metric.improvement(baseline, candidate)
}

type evalWorkloadFile struct {
	Path       string         `json:"path"`
	Bytes      int            `json:"bytes"`
	Policies   int            `json:"policies"`
	Efficiency evalEfficiency `json:"efficiency"`
	Error      string         `json:"error,omitempty"`
}

type evalWorkloadReport struct {
	Kind       string             `json:"kind"`
	Model      string             `json:"model"`
	Variant    string             `json:"variant"`
	Files      []evalWorkloadFile `json:"files"`
	Efficiency evalEfficiency     `json:"efficiency"`
}

// runWorkload evaluates real files with every matching default policy, as the CLI would.
func (run evalRun) runWorkload(ctx context.Context, root string, paths []string) (evalWorkloadReport, error) {
	settings := run.options.requestSettings()
	variant, err := evalDigest(settings.prompts)
	if err != nil {
		return evalWorkloadReport{}, err
	}
	report := evalWorkloadReport{Kind: "semantic-eval-workload", Model: settings.model, Variant: variant, Files: make([]evalWorkloadFile, len(paths))}
	jobs := make(chan int)
	var workers sync.WaitGroup
	for range min(evalCaseConcurrency, len(paths)) {
		workers.Add(1)
		go func() {
			defer workers.Done()
			for index := range jobs {
				report.Files[index] = run.runWorkloadFile(ctx, root, paths[index])
			}
		}()
	}
	for index := range paths {
		jobs <- index
	}
	close(jobs)
	workers.Wait()
	efficiencies := make([]evalEfficiency, len(report.Files))
	for index, file := range report.Files {
		efficiencies[index] = file.Efficiency
	}
	report.Efficiency = sumEfficiency(efficiencies)
	return report, nil
}

func (run evalRun) runWorkloadFile(ctx context.Context, root, path string) evalWorkloadFile {
	file := evalWorkloadFile{Path: path}
	content, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(path)))
	if err != nil {
		file.Error = err.Error()
		return file
	}
	rules := rulesForPath(run.rules, nil, path)
	file.Bytes, file.Policies = len(content), len(rules)
	tracer := &tracingEvaluator{next: run.next, cache: run.cache}
	started := time.Now()
	_, err = evaluateSource(ctx, Source{Path: path, Text: string(content)}, rules, run.options, tracer)
	file.Efficiency = measureEfficiency(tracer.entries, time.Since(started))
	if err != nil {
		file.Error = err.Error()
	}
	return file
}
