package utils

import (
	"sync"

	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/compiler"
	"github.com/andrueandersoncs/typescript-go/core"
	"github.com/andrueandersoncs/typescript-go/parser"
	"github.com/andrueandersoncs/typescript-go/tsoptions"
	"github.com/andrueandersoncs/typescript-go/tspath"
	"github.com/andrueandersoncs/typescript-go/vfs"
)

var _ compiler.CompilerHost = (*compilerHost)(nil)

type syncMap[K comparable, V any] struct {
	values sync.Map
}

func (m *syncMap[K, V]) Load(key K) (value V, ok bool) {
	stored, ok := m.values.Load(key)
	if !ok || stored == nil {
		return value, ok
	}
	return stored.(V), true
}

func (m *syncMap[K, V]) LoadOrStore(key K, value V) (actual V, loaded bool) {
	stored, loaded := m.values.LoadOrStore(key, value)
	if stored == nil {
		return actual, loaded
	}
	return stored.(V), loaded
}

type compilerHost struct {
	currentDirectory          string
	fs                        vfs.FS
	defaultLibraryPath        string
	extendedConfigCache       tsoptions.ExtendedConfigCache
	trace                     func(msg *ast.DiagnosticsMessage, args ...any)
	resolvedProjectReferences syncMap[tspath.Path, *tsoptions.ParsedCommandLine]
}

func NewCompilerHost(
	currentDirectory string,
	fs vfs.FS,
	defaultLibraryPath string,
	extendedConfigCache tsoptions.ExtendedConfigCache,
	trace func(msg *ast.DiagnosticsMessage, args ...any),
) compiler.CompilerHost {
	if trace == nil {
		trace = func(msg *ast.DiagnosticsMessage, args ...any) {}
	}
	return &compilerHost{
		currentDirectory:    currentDirectory,
		fs:                  fs,
		defaultLibraryPath:  defaultLibraryPath,
		extendedConfigCache: extendedConfigCache,
		trace:               trace,
	}
}

func (h *compilerHost) FS() vfs.FS {
	return h.fs
}

func (h *compilerHost) DefaultLibraryPath() string {
	return h.defaultLibraryPath
}

func (h *compilerHost) GetCurrentDirectory() string {
	return h.currentDirectory
}

func (h *compilerHost) Trace(msg *ast.DiagnosticsMessage, args ...any) {
	h.trace(msg, args...)
}

var sourceFileCache syncMap[SourceFileCacheKey, *ast.SourceFile]

type SourceFileCacheKey struct {
	opts       ast.SourceFileParseOptions
	text       string
	scriptKind core.ScriptKind
}

func GetSourceFileCacheKey(opts ast.SourceFileParseOptions, text string, scriptKind core.ScriptKind) SourceFileCacheKey {
	return SourceFileCacheKey{
		opts:       opts,
		text:       text,
		scriptKind: scriptKind,
	}
}

func (h *compilerHost) GetSourceFile(opts ast.SourceFileParseOptions) *ast.SourceFile {
	text, ok := h.FS().ReadFile(opts.FileName)
	if !ok {
		return nil
	}

	scriptKind := core.GetScriptKindFromFileName(opts.FileName)
	if scriptKind == core.ScriptKindUnknown {
		panic("Unknown script kind for file  " + opts.FileName)
	}

	key := GetSourceFileCacheKey(opts, text, scriptKind)

	if cached, ok := sourceFileCache.Load(key); ok {
		return cached
	}

	sourceFile := parser.ParseSourceFile(opts, text, scriptKind)
	result, _ := sourceFileCache.LoadOrStore(key, sourceFile)
	return result
}

func (h *compilerHost) GetResolvedProjectReference(fileName string, path tspath.Path) *tsoptions.ParsedCommandLine {
	if cached, ok := h.resolvedProjectReferences.Load(path); ok {
		return cached
	}
	commandLine, _ := tsoptions.GetParsedCommandLineOfConfigFilePath(fileName, path, nil, nil, h, h.extendedConfigCache)
	result, _ := h.resolvedProjectReferences.LoadOrStore(path, commandLine)
	return result
}
