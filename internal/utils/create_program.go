package utils

import (
	"errors"
	"fmt"

	"github.com/andrueandersoncs/typescript-go/bundled"
	"github.com/andrueandersoncs/typescript-go/compiler"
	"github.com/andrueandersoncs/typescript-go/core"
	"github.com/andrueandersoncs/typescript-go/tsoptions"
	"github.com/andrueandersoncs/typescript-go/tspath"
	"github.com/andrueandersoncs/typescript-go/vfs"
)

func CreateCompilerHost(cwd string, fs vfs.FS) compiler.CompilerHost {
	defaultLibraryPath := bundled.LibPath()
	return NewCompilerHost(cwd, fs, defaultLibraryPath, nil, nil)
}

func CreateProgram(fs vfs.FS, cwd string, tsconfigPath string, host compiler.CompilerHost) (*compiler.Program, error) {
	resolvedConfigPath := tspath.ResolvePath(cwd, tsconfigPath)
	if !fs.FileExists(resolvedConfigPath) {
		return nil, fmt.Errorf("couldn't read tsconfig at %v", resolvedConfigPath)
	}

	configParseResult, diagnostics := tsoptions.GetParsedCommandLineOfConfigFile(tsconfigPath, &core.CompilerOptions{}, nil, host, nil)
	if configParseResult == nil || len(diagnostics) > 0 || len(configParseResult.Errors) > 0 {
		return nil, nil
	}

	program := compiler.NewProgram(compiler.ProgramOptions{
		Config:                      configParseResult,
		SingleThreaded:              core.TSFalse,
		Host:                        host,
		UseSourceOfProjectReference: true,
		// TODO: custom checker pool
		// CreateCheckerPool: func(p *compiler.Program) compiler.CheckerPool {},
	})
	if program == nil {
		return nil, errors.New("couldn't create program")
	}

	if len(program.GetProgramDiagnostics()) > 0 {
		return nil, nil
	}

	// TODO: report syntactic diagnostics?

	program.BindSourceFiles()

	return program, nil
}
