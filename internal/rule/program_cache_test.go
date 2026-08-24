package rule

import (
	"sync"
	"sync/atomic"
	"testing"
)

func TestProgramCacheValueBuildsOnce(t *testing.T) {
	ctx := RuleContext{ProgramCache: NewProgramCache()}
	var builds atomic.Int32
	var wait sync.WaitGroup
	for range 32 {
		wait.Go(func() {
			value := ProgramCacheValue(ctx, "test", func() int {
				builds.Add(1)
				return 42
			})
			if value != 42 {
				t.Errorf("ProgramCacheValue() = %d, want 42", value)
			}
		})
	}
	wait.Wait()
	if got := builds.Load(); got != 1 {
		t.Fatalf("builder called %d times, want 1", got)
	}
}
