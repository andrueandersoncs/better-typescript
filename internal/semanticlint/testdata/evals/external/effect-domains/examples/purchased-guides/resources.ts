import { Authorization } from "effect-domains/authorization"
import { Resource } from "effect-domains/resource"
import { ExampleRoles, ExampleSubjectSchema } from "@effect-domains/example-support/subject"
import { GuidePurchaseSchema, GuideSchema } from "./domain.ts"

const policy = Authorization.for({ resource: GuideSchema, subject: ExampleSubjectSchema })
const guidePurchase = policy.entitlement({ name: "guides.read", key: policy.row.id })
const tenantScope = policy.sameAs("tenantId")
const tenantReader = policy.all(tenantScope, ExampleRoles.reader.expression)
const guideScope = policy.all()

const guideAuthorization = policy.policy({
  scope: guideScope,
  allow: {
    read: tenantReader,
    create: ExampleRoles.admin,
  },
  require: {
    read: [guidePurchase],
  },
})

const purchasePolicy = Authorization.for({ resource: GuidePurchaseSchema, subject: ExampleSubjectSchema })
const purchaseScope = purchasePolicy.all()

const purchaseAuthorization = purchasePolicy.policy({
  scope: purchaseScope,
  allow: {
    read: ExampleRoles.admin,
    create: ExampleRoles.admin,
  },
})

const guideCapabilities = [Resource.get(), Resource.list({ limit: 25 })]

export const GuidesResource = Resource.define({
  authorization: guideAuthorization,
  name: "guides",
  schema: GuideSchema,
  capabilities: guideCapabilities,
})

export const GuidePurchasesResource = Resource.define({
  authorization: purchaseAuthorization,
  name: "guide_purchases",
  schema: GuidePurchaseSchema,
  capabilities: [],
})
