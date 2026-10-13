package semanticlint

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"math/rand/v2"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type evaluator interface {
	Evaluate(context.Context, evaluationRequest) (evaluationResponse, error)
}

type typeSafeClient struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

// newTypeSafeClient reads settings from the environment, falling back to root/.env.
func newTypeSafeClient(root string) (*typeSafeClient, error) {
	dotEnv, err := readDotEnv(filepath.Join(root, ".env"))
	if err != nil {
		return nil, err
	}
	setting := func(key string) string {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
		return dotEnv[key]
	}
	apiKey := setting("TYPESAFE_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("TYPESAFE_API_KEY is required for live semantic evaluation; set it in the environment or .env")
	}
	baseURL := strings.TrimRight(setting("TYPESAFE_BASE_URL"), "/")
	if baseURL == "" {
		baseURL = "https://api.typesafe.ai"
	}
	return &typeSafeClient{
		apiKey: apiKey, baseURL: baseURL,
		client: &http.Client{},
	}, nil
}

// readDotEnv parses KEY=VALUE lines; a missing file is empty.
func readDotEnv(path string) (map[string]string, error) {
	content, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	values := make(map[string]string)
	for line := range strings.Lines(string(content)) {
		key, value, found := strings.Cut(strings.TrimPrefix(strings.TrimSpace(line), "export "), "=")
		if !found || strings.HasPrefix(key, "#") {
			continue
		}
		value = strings.TrimSpace(value)
		if len(value) >= 2 && (value[0] == '"' || value[0] == '\'') && value[len(value)-1] == value[0] {
			value = value[1 : len(value)-1]
		}
		values[strings.TrimSpace(key)] = value
	}
	return values, nil
}

func (client *typeSafeClient) Evaluate(ctx context.Context, request evaluationRequest) (evaluationResponse, error) {
	request.Model = modelOrDefault(request.Model)
	body, err := marshalJSON(request)
	if err != nil {
		return evaluationResponse{}, fmt.Errorf("encode TypeSafe request: %w", err)
	}
	var lastErr error
	for attempt := 0; attempt <= maximumHTTPRetries; attempt++ {
		response, retryAfter, retry, err := client.attempt(ctx, body)
		if err == nil {
			return response, nil
		}
		lastErr = err
		if !retry || attempt == maximumHTTPRetries {
			break
		}
		delay := retryAfter
		if delay <= 0 || delay > time.Minute {
			delay = 500 * time.Millisecond * time.Duration(1<<attempt)
			delay -= time.Duration(rand.Float64() * 0.25 * float64(delay))
		}
		timer := time.NewTimer(delay)
		select {
		case <-timer.C:
		case <-ctx.Done():
			timer.Stop()
			return evaluationResponse{}, ctx.Err()
		}
	}
	return evaluationResponse{}, lastErr
}

func (client *typeSafeClient) attempt(ctx context.Context, body []byte) (evaluationResponse, time.Duration, bool, error) {
	attemptContext, cancel := context.WithTimeout(ctx, defaultHTTPTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(attemptContext, http.MethodPost, client.baseURL+"/v1/systemone", bytes.NewReader(body))
	if err != nil {
		return evaluationResponse{}, 0, false, fmt.Errorf("create TypeSafe request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+client.apiKey)
	req.Header.Set("Content-Type", "application/json")
	response, err := client.client.Do(req)
	if err != nil {
		return evaluationResponse{}, 0, true, fmt.Errorf("TypeSafe request failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		detail, _ := io.ReadAll(io.LimitReader(response.Body, 16_384))
		message := strings.TrimSpace(string(detail))
		if message == "" {
			message = response.Status
		}
		retry := response.StatusCode == http.StatusRequestTimeout || response.StatusCode == http.StatusTooManyRequests || response.StatusCode >= 500
		return evaluationResponse{}, retryDelay(response.Header), retry, fmt.Errorf("TypeSafe request failed (%s): %s", response.Status, message)
	}
	var decoded evaluationResponse
	decoder := json.NewDecoder(io.LimitReader(response.Body, 4*maximumRequestBytes))
	if err := decoder.Decode(&decoded); err != nil {
		return evaluationResponse{}, 0, false, fmt.Errorf("decode TypeSafe response: %w", err)
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return evaluationResponse{}, 0, false, fmt.Errorf("decode TypeSafe response: expected one JSON value")
	}
	if err := validateResponse(decoded); err != nil {
		return evaluationResponse{}, 0, false, err
	}
	return decoded, 0, false, nil
}

func retryDelay(header http.Header) time.Duration {
	if milliseconds, err := strconv.Atoi(header.Get("retry-after-ms")); err == nil && milliseconds >= 0 {
		return time.Duration(milliseconds) * time.Millisecond
	}
	value := header.Get("Retry-After")
	if seconds, err := strconv.Atoi(value); err == nil && seconds >= 0 {
		return time.Duration(seconds) * time.Second
	}
	if instant, err := http.ParseTime(value); err == nil {
		return time.Until(instant)
	}
	return 0
}

func validateResponse(response evaluationResponse) error {
	if response.Model == "" || response.Answers == nil || response.Usage.InputTokens < 0 || response.Usage.OutputTokens < 0 {
		return fmt.Errorf("TypeSafe returned an invalid response")
	}
	for _, answer := range response.Answers {
		if answer.Type != "noul" || !validProbability(answer.Noul) {
			return fmt.Errorf("TypeSafe returned an invalid Noul answer")
		}
	}
	return nil
}

func validProbability(value float64) bool {
	return value >= 0 && value <= 1
}
