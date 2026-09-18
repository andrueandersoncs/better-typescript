package fileglob

import "testing"

func TestPatternMatchesRecursiveDirectories(t *testing.T) {
	pattern, err := Compile("src/**/selected.ts")
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"src/selected.ts", "src/nested/selected.ts", "src/deep/nested/selected.ts"} {
		if !pattern.Match(name) {
			t.Errorf("pattern did not match %s", name)
		}
	}
	if pattern.Match("test/selected.ts") {
		t.Error("pattern matched file outside src")
	}
}

func TestCompileAllExpandsBraces(t *testing.T) {
	patterns, err := CompileAll("**/*.{ts,tsx}")
	if err != nil {
		t.Fatal(err)
	}
	if len(patterns) != 2 || !patterns[0].Match("src/main.ts") || !patterns[1].Match("src/main.tsx") {
		t.Fatalf("patterns did not match TypeScript extensions: %#v", patterns)
	}
}

func TestCompileRejectsInvalidPattern(t *testing.T) {
	if _, err := Compile("src/[.ts"); err == nil {
		t.Fatal("expected invalid pattern error")
	}
	if _, err := CompileAll("src/*.{ts,"); err == nil {
		t.Fatal("expected invalid brace error")
	}
}
