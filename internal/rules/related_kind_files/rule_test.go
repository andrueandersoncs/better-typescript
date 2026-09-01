package related_kind_files

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "related-kind-files", Level: "error", Message: "removeUser is split from related effects in src/users/effects.ts. Its public signature relates it through {User, UserError}; its Effect requirements are {OtherRepository}. Place related effects together in one dedicated module's effects.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/admin/effects.ts", Line: 4, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "startCron is split from related effects in src/jobs2/effects.ts. Its public signature relates it through {Cron}. Place related effects together in one dedicated module's effects.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/jobs1/effects.ts", Line: 3, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "stopCron is split from related effects in src/jobs1/effects.ts. Its public signature relates it through {Cron}. Place related effects together in one dedicated module's effects.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/jobs2/effects.ts", Line: 3, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "loadUser is mixed with unrelated effects in effects.ts. Its public signature relates it through {User}, while loadOrder relates through {Order}. Separate each relationship into its own domain module's effects.ts. Choose module names from the repository domain vocabulary.", FilePath: "src/mixed/effects.ts", Line: 4, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "loadOrder is mixed with unrelated effects in effects.ts. Its public signature relates it through {Order}, while loadUser relates through {User}. Separate each relationship into its own domain module's effects.ts. Choose module names from the repository domain vocabulary.", FilePath: "src/mixed/effects.ts", Line: 5, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "findUser is split from related effects in src/admin/effects.ts. Its public signature relates it through {User, UserError}; its Effect requirements are {UserRepository}. Place related effects together in one dedicated module's effects.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/users/effects.ts", Line: 4, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "userSchema has kind schema in wrong.ts. Place schema entities in schemas.ts within a dedicated domain module. Choose the module name from the repository domain vocabulary.", FilePath: "src/wrong.ts", Line: 4, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "UserFromSchema has kind schema in wrong.ts. Place schema entities in schemas.ts within a dedicated domain module. Choose the module name from the repository domain vocabulary.", FilePath: "src/wrong.ts", Line: 5, Column: 13},
		{RuleName: "related-kind-files", Level: "error", Message: "UserFailure has kind error in wrong.ts. Place error entities in errors.ts within a dedicated domain module. Choose the module name from the repository domain vocabulary.", FilePath: "src/wrong.ts", Line: 6, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "UserService has kind service in wrong.ts. Place service entities in services.ts within a dedicated domain module. Choose the module name from the repository domain vocabulary.", FilePath: "src/wrong.ts", Line: 7, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "UserLayer has kind layer in wrong.ts. Place layer entities in layers.ts within a dedicated domain module. Choose the module name from the repository domain vocabulary.", FilePath: "src/wrong.ts", Line: 8, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "userConfig has kind config in wrong.ts. Place config entities in config.ts within a dedicated domain module. Choose the module name from the repository domain vocabulary.", FilePath: "src/wrong.ts", Line: 9, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "loadUser has kind effect in wrong.ts. Place effect entities in effects.ts within a dedicated domain module. Choose the module name from the repository domain vocabulary.", FilePath: "src/wrong.ts", Line: 10, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "program has kind effect in wrong.ts. Place effect entities in effects.ts within a dedicated domain module. Choose the module name from the repository domain vocabulary.", FilePath: "src/wrong.ts", Line: 11, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "normalizeUser has kind algorithm in wrong.ts. Place algorithm entities in algorithms.ts within a dedicated domain module. Choose the module name from the repository domain vocabulary.", FilePath: "src/wrong.ts", Line: 12, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "UserView has kind type in wrong.ts. Place type entities in types.ts within a dedicated domain module. Choose the module name from the repository domain vocabulary.", FilePath: "src/wrong.ts", Line: 13, Column: 18},
		{RuleName: "related-kind-files", Level: "error", Message: "defaultUser has kind constant in wrong.ts. Place constant entities in constants.ts within a dedicated domain module. Choose the module name from the repository domain vocabulary.", FilePath: "src/wrong.ts", Line: 14, Column: 22},
	})
}

func TestClean(t *testing.T) {
	ruletest.Assert(t, "testdata/clean", Rule, []analysis.Violation{})
}

func TestTypeOwnership(t *testing.T) {
	ruletest.Assert(t, "testdata/type-ownership", Rule, []analysis.Violation{})
}

func TestAliases(t *testing.T) {
	ruletest.Assert(t, "testdata/aliases", Rule, []analysis.Violation{
		{RuleName: "related-kind-files", Level: "error", Message: "first is split from related effects in src/b/effects.ts. Its public signature relates it through {Status, UserError, UserId}; its Effect requirements are {UserRepository}. Place related effects together in one dedicated module's effects.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/a/effects.ts", Line: 3, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "second is split from related effects in src/a/effects.ts. Its public signature relates it through {Status, UserError, UserId}; its Effect requirements are {UserRepository}. Place related effects together in one dedicated module's effects.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/b/effects.ts", Line: 3, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "loadEither is split from related effects in src/d/effects.ts. Its public signature relates it through {Order, OrderError, User, UserError}; its Effect requirements are {UserRepository}. Place related effects together in one dedicated module's effects.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/c/effects.ts", Line: 2, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "removeEither is split from related effects in src/c/effects.ts. Its public signature relates it through {Order, OrderError, User, UserError}; its Effect requirements are {UserRepository}. Place related effects together in one dedicated module's effects.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/d/effects.ts", Line: 2, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "firstValue is split from related effects in src/f/effects.ts. Its public signature relates it through {UserError, UserId}; its Effect requirements are {UserRepository}. Place related effects together in one dedicated module's effects.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/e/effects.ts", Line: 3, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "secondValue is split from related effects in src/e/effects.ts. Its public signature relates it through {UserError, UserId}; its Effect requirements are {UserRepository}. Place related effects together in one dedicated module's effects.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/f/effects.ts", Line: 3, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "firstGeneric is split from related effects in src/h/effects.ts. Its public signature relates it through {User}. Place related effects together in one dedicated module's effects.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/g/effects.ts", Line: 3, Column: 25},
		{RuleName: "related-kind-files", Level: "error", Message: "secondGeneric is split from related effects in src/g/effects.ts. Its public signature relates it through {User}. Place related effects together in one dedicated module's effects.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/h/effects.ts", Line: 3, Column: 25},
	})
}

func TestGenericRelationships(t *testing.T) {
	ruletest.Assert(t, "testdata/generics", Rule, []analysis.Violation{
		{RuleName: "related-kind-files", Level: "error", Message: "userOrders is mixed with unrelated constants in constants.ts. Its public signature relates it through {Order, User}, while userProducts relates through {Product, User}. Separate each relationship into its own domain module's constants.ts. Choose module names from the repository domain vocabulary.", FilePath: "src/constants.ts", Line: 2, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "userProducts is mixed with unrelated constants in constants.ts. Its public signature relates it through {Product, User}, while userOrders relates through {Order, User}. Separate each relationship into its own domain module's constants.ts. Choose module names from the repository domain vocabulary.", FilePath: "src/constants.ts", Line: 3, Column: 22},
	})
}

func TestClassRelationships(t *testing.T) {
	ruletest.Assert(t, "testdata/classes", Rule, []analysis.Violation{
		{RuleName: "related-kind-files", Level: "error", Message: "FirstError is split from related errors in src/second/errors.ts. Its public signature relates it through {ErrorData}. Place related errors together in one dedicated module's errors.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/first/errors.ts", Line: 2, Column: 14},
		{RuleName: "related-kind-files", Level: "error", Message: "FirstModel is split from related schemas in src/second/schemas.ts. Its public signature relates it through {SchemaData}. Place related schemas together in one dedicated module's schemas.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/first/schemas.ts", Line: 3, Column: 14},
		{RuleName: "related-kind-files", Level: "error", Message: "FirstService is split from related services in src/second/services.ts. Its public signature relates it through {ServiceData}. Place related services together in one dedicated module's services.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/first/services.ts", Line: 3, Column: 14},
		{RuleName: "related-kind-files", Level: "error", Message: "SecondError is split from related errors in src/first/errors.ts. Its public signature relates it through {ErrorData}. Place related errors together in one dedicated module's errors.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/second/errors.ts", Line: 2, Column: 14},
		{RuleName: "related-kind-files", Level: "error", Message: "SecondModel is split from related schemas in src/first/schemas.ts. Its public signature relates it through {SchemaData}. Place related schemas together in one dedicated module's schemas.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/second/schemas.ts", Line: 3, Column: 14},
		{RuleName: "related-kind-files", Level: "error", Message: "SecondService is split from related services in src/first/services.ts. Its public signature relates it through {ServiceData}. Place related services together in one dedicated module's services.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/second/services.ts", Line: 3, Column: 14},
	})
}

func TestLocalDeclarations(t *testing.T) {
	ruletest.Assert(t, "testdata/declarations", Rule, []analysis.Violation{
		{RuleName: "related-kind-files", Level: "error", Message: "firstDeclared is split from related algorithms in src/b/algorithms.ts. Its public signature relates it through {User}. Place related algorithms together in one dedicated module's algorithms.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/a/algorithms.ts", Line: 2, Column: 22},
		{RuleName: "related-kind-files", Level: "error", Message: "secondDeclared is split from related algorithms in src/a/algorithms.ts. Its public signature relates it through {User}. Place related algorithms together in one dedicated module's algorithms.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/b/algorithms.ts", Line: 2, Column: 22},
	})
}

func TestStaticTypeOwnership(t *testing.T) {
	ruletest.Assert(t, "testdata/statics", Rule, []analysis.Violation{})
}

func TestNestedConfigUsesProgramRoot(t *testing.T) {
	ruletest.Assert(t, "testdata/nested-config", Rule, []analysis.Violation{
		{RuleName: "related-kind-files", Level: "error", Message: "nested is split from related algorithms in src/outer/algorithms.ts. Its public signature relates it through {User}. Place related algorithms together in one dedicated module's algorithms.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/nested/algorithms.ts", Line: 2, Column: 25},
		{RuleName: "related-kind-files", Level: "error", Message: "outer is split from related algorithms in src/nested/algorithms.ts. Its public signature relates it through {User}. Place related algorithms together in one dedicated module's algorithms.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/outer/algorithms.ts", Line: 2, Column: 25},
	})
}

func TestRecursiveEffectChannelPolicy(t *testing.T) {
	ruletest.Assert(t, "testdata/channel-policy", Rule, []analysis.Violation{
		{RuleName: "related-kind-files", Level: "error", Message: "first is split from related algorithms in src/b/algorithms.ts. Its public signature relates it through {User, UserError}; its Effect requirements are {RepoA}. Place related algorithms together in one dedicated module's algorithms.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/a/algorithms.ts", Line: 3, Column: 25},
		{RuleName: "related-kind-files", Level: "error", Message: "second is split from related algorithms in src/a/algorithms.ts. Its public signature relates it through {User, UserError}; its Effect requirements are {RepoB}. Place related algorithms together in one dedicated module's algorithms.ts. Choose the module name from the repository domain vocabulary.", FilePath: "src/b/algorithms.ts", Line: 3, Column: 25},
	})
}
