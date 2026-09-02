interface Action {
  readonly outcome: string
}

const applyInit = (action: Action) => ({ outcome: action.outcome })
void applyInit
