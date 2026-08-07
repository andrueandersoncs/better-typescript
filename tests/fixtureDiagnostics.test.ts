import { fixtureProjects } from "./fixtureDiagnosticsFixtureProjects.js"
import { exampleProjects } from "./fixtureDiagnosticsExampleProjects.js"
import { registerFixtureTest } from "./fixtureDiagnosticsProjectProblems.js"

;[...fixtureProjects, ...exampleProjects()].forEach(registerFixtureTest)
