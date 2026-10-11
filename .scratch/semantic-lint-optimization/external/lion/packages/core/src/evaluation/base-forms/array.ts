import { Array as Arr, Effect, Match, pipe, Schema } from "effect";
import { InvalidFunctionCallError } from "@/errors/evaluation";
import { evaluateBegin } from "@/evaluation/special-forms/begin.ts";
import { evaluateCond } from "@/evaluation/special-forms/cond.ts";
import { evaluateDefine } from "@/evaluation/special-forms/define.ts";
import { evaluateEval } from "@/evaluation/special-forms/eval.ts";
import { evaluateFunctionCall } from "@/evaluation/special-forms/function.ts";
import { evaluateLambda } from "@/evaluation/special-forms/lambda";
import { evaluateMatch } from "@/evaluation/special-forms/match";
import { evaluateQuote } from "@/evaluation/special-forms/quote.ts";
import {
  BeginFormSchema,
  CondFormSchema,
  DefineFormSchema,
  EvalFormSchema,
  FunctionCallFormSchema,
  LambdaFormSchema,
  MatchFormSchema,
  QuoteFormSchema,
} from "@/schemas/evaluation.ts";
import type { LionArrayExpressionType } from "@/schemas/lion-expression.ts";

export const evaluateArray = (expression: LionArrayExpressionType) =>
  pipe(
    Match.value(expression),
    Match.when(Arr.isEmptyReadonlyArray, Effect.succeed),
    Match.when(Schema.is(EvalFormSchema), (_) => evaluateEval(_)),
    Match.when(Schema.is(QuoteFormSchema), (_) => evaluateQuote(_)),
    Match.when(Schema.is(BeginFormSchema), (_) => evaluateBegin(_)),
    Match.when(Schema.is(DefineFormSchema), (_) => evaluateDefine(_)),
    Match.when(Schema.is(LambdaFormSchema), (_) => evaluateLambda(_)),
    Match.when(Schema.is(CondFormSchema), (_) => evaluateCond(_)),
    Match.when(Schema.is(MatchFormSchema), (_) => evaluateMatch(_)),
    Match.when(Schema.is(FunctionCallFormSchema), (_) =>
      evaluateFunctionCall(_)
    ),
    Match.orElse(() =>
      Effect.fail(new InvalidFunctionCallError({ expression }))
    )
  );
