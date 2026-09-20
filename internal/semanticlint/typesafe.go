package semanticlint

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand/v2"
	"net/http"
	"os"
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

func newTypeSafeClient() (*typeSafeClient, error) {
	apiKey := strings.TrimSpace(os.Getenv("TYPESAFE_API_KEY"))
	if apiKey == "" {
		return nil, fmt.Errorf("TYPESAFE_API_KEY is required for live semantic evaluation")
	}
	baseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("TYPESAFE_BASE_URL")), "/")
	if baseURL == "" {
		baseURL = "https://api.typesafe.ai"
	}
	return &typeSafeClient{
		apiKey: apiKey, baseURL: baseURL,
		client: &http.Client{},
	}, nil
}

func (client *typeSafeClient) Evaluate(ctx context.Context, request evaluationRequest) (evaluationResponse, error) {
	if request.Model == "" {
		request.Model = defaultModel
	}
	body, err := marshalJSON(request)
	if err != nil {
		return evaluationResponse{}, fmt.Errorf("encode TypeSafe request: %w", err)
	}
	var lastErr error
	for attempt := 0; attempt <= maximumHTTPRetries; attempt++ {
		response, retryAfter, retry, err := client.attempt(ctx, body)
		if err == nil {
			response.Partition = evaluationHash(request)
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
		switch answer.Type {
		case "noul":
			if !validProbability(answer.Noul) {
				return fmt.Errorf("TypeSafe returned an invalid Noul answer")
			}
		case "choice":
			if answer.Choice == "" || !validProbability(answer.Confidence) || len(answer.Probabilities) == 0 {
				return fmt.Errorf("TypeSafe returned an invalid Choice answer")
			}
			for _, probability := range answer.Probabilities {
				if !validProbability(probability) {
					return fmt.Errorf("TypeSafe returned an invalid Choice probability")
				}
			}
		default:
			return fmt.Errorf("TypeSafe returned an unsupported answer type %q", answer.Type)
		}
	}
	return nil
}

func validProbability(value float64) bool {
	return value >= 0 && value <= 1
}
