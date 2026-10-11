import React, { useState } from 'react'
import { ContractFunction, DeriveMethod } from '../types'
import FunctionCard from './FunctionCard'
import StreamingText from './StreamingText'
import './FunctionEditor.css'

interface FunctionEditorProps {
  function: ContractFunction
  contractAddress?: string
  contractName?: string
  contractIcon?: string
  initialInputValues?: Record<string, string>
  actionName: string
  actionDescription: string
  activeMode: 'edit' | 'test'
  onPublish: (name: string, description: string, inputValues: Record<string, string>) => void
  onContractClick?: (contractId: string) => void
}

const DERIVE_METHOD_LABELS: Record<DeriveMethod, string> = {
  user_input: 'User Input',
  user_wallet: 'User Wallet',
  creator_hardcoded: 'Creator Hardcoded',
  relational: 'Relational',
  code: 'Code',
  encode_calldata: 'Encode Calldata'
}

const DERIVE_METHOD_DESCRIPTIONS: Record<DeriveMethod, string> = {
  user_input: 'User will fill in this value',
  user_wallet: 'Uses connected wallet address',
  creator_hardcoded: 'Pre-filled by action creator',
  relational: 'Derived from other contract data',
  code: 'Calculated via code execution',
  encode_calldata: 'Generated from encoded function data'
}

export default function FunctionEditor({ 
  function: func, 
  contractAddress, 
  contractName,
  contractIcon,
  initialInputValues = {},
  actionName,
  actionDescription,
  activeMode,
  onPublish,
  onContractClick
}: FunctionEditorProps) {
  const [inputValues, setInputValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    func.inputs.forEach(input => {
      initial[input.name] = initialInputValues[input.name] || input.suggestedValue || ''
    })
    return initial
  })

  const [deriveMethods, setDeriveMethods] = useState<Record<string, DeriveMethod>>(() => {
    const initial: Record<string, DeriveMethod> = {}
    func.inputs.forEach(input => {
      initial[input.name] = input.deriveMethod || 'user_input'
    })
    return initial
  })

  const [deriveMethodSuggestions, setDeriveMethodSuggestions] = useState<Record<string, boolean>>(() => {
    // Track which non-user_input derive methods need acceptance
    const initial: Record<string, boolean> = {}
    func.inputs.forEach(input => {
      const deriveMethod = input.deriveMethod || 'user_input'
      // All non-user_input fields need acceptance since they're agent-suggested
      if (deriveMethod !== 'user_input') {
        initial[input.name] = false // false means not accepted yet
      }
    })
    return initial
  })

  // Ask Agent feature states
  const [isAskAgentMode, setIsAskAgentMode] = useState(false)
  const [agentGuidance, setAgentGuidance] = useState('')
  const [selectedInputs, setSelectedInputs] = useState<Set<string>>(new Set())
  const [isAgentResearching, setIsAgentResearching] = useState(false)

  // Expose handlePublish to parent via useEffect
  React.useEffect(() => {
    // Store reference so parent can call it
    (window as any).__publishAction = handlePublish
  }, [actionName, actionDescription, inputValues])

  const handleInputChange = (name: string, value: string) => {
    setInputValues(prev => ({ ...prev, [name]: value }))
  }

  const handleDeriveMethodChange = (name: string, method: DeriveMethod) => {
    setDeriveMethods(prev => ({ ...prev, [name]: method }))
    
    // Mark as needing acceptance if changing to non-user_input
    if (method !== 'user_input') {
      setDeriveMethodSuggestions(prev => ({ ...prev, [name]: false }))
    } else {
      // Remove from suggestions if changing to user_input
      setDeriveMethodSuggestions(prev => {
        const updated = { ...prev }
        delete updated[name]
        return updated
      })
    }
  }

  const handleAcceptDeriveMethod = (name: string) => {
    setDeriveMethodSuggestions(prev => ({ ...prev, [name]: true }))
  }

  const handleRejectDeriveMethod = (name: string) => {
    // Rejecting means reverting to user_input
    setDeriveMethods(prev => ({ ...prev, [name]: 'user_input' }))
    setDeriveMethodSuggestions(prev => {
      const updated = { ...prev }
      delete updated[name]
      return updated
    })
    // Clear the pre-filled value
    setInputValues(prev => ({ ...prev, [name]: '' }))
  }

  const handlePublish = () => {
    if (actionName.trim()) {
      onPublish(actionName.trim(), actionDescription.trim(), inputValues)
    }
  }

  const handleAskAgentClick = () => {
    setIsAskAgentMode(true)
    setSelectedInputs(new Set())
    setAgentGuidance('')
  }

  const handleCancelAskAgent = () => {
    setIsAskAgentMode(false)
    setSelectedInputs(new Set())
    setAgentGuidance('')
  }

  const handleAskAgent = () => {
    setIsAgentResearching(true)
    setIsAskAgentMode(false)
  }

  const handleToggleInput = (inputName: string) => {
    setSelectedInputs(prev => {
      const next = new Set(prev)
      if (next.has(inputName)) {
        next.delete(inputName)
      } else {
        next.add(inputName)
      }
      return next
    })
  }


  return (
    <div className="function-editor">
      {activeMode === 'edit' ? (
        <>
          <div className="function-editor-header">
            <FunctionCard
              contractName={contractName || contractAddress || 'Unknown Contract'}
              contractIcon={contractIcon}
              func={func}
              variant="default"
              onContractClick={contractAddress ? () => onContractClick?.(contractAddress) : undefined}
            />
          </div>
      
          <div className="function-editor-content">
            <div className="function-editor-main">
          <div className="inputs-section">
            <div className="inputs-header-row">
              <h4 className="inputs-title">Inputs</h4>
              <button 
                className="ask-agent-button" 
                onClick={handleAskAgentClick}
                disabled={isAskAgentMode || isAgentResearching}
              >
                Ask Agent
              </button>
            </div>

            {isAskAgentMode && (
              <div className="ask-agent-input-area">
                <div className="ask-agent-input-row">
                  <input
                    type="text"
                    className="ask-agent-input"
                    placeholder="Select the inputs you want help with, and any guidance you can give the agent on the desired input values."
                    value={agentGuidance}
                    onChange={(e) => setAgentGuidance(e.target.value)}
                  />
                  <button className="ask-agent-ask-button" onClick={handleAskAgent}>
                    Ask
                  </button>
                  <button className="ask-agent-cancel-button" onClick={handleCancelAskAgent}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isAgentResearching && (
              <div className="agent-research-card">
                <div className="agent-research-title">
                  Agent beginning to research input values for:
                </div>
                <ul className="agent-research-list">
                  {Array.from(selectedInputs).map(inputName => (
                    <li key={inputName}>{inputName}</li>
                  ))}
                </ul>
                <div className="agent-research-status">
                  <StreamingText 
                    text="Researching recent transactions... reading the contract details and code..."
                    speed={15}
                  />
                </div>
              </div>
            )}

            <div className="inputs-list">
              {func.inputs.map((input, index) => {
                const deriveMethod = deriveMethods[input.name] || 'user_input'
                const isUserInput = deriveMethod === 'user_input'
                const isReadOnly = !isUserInput
                const needsAcceptance = deriveMethod !== 'user_input' && deriveMethodSuggestions[input.name] === false
                const showSuggestions = !isAskAgentMode && !isAgentResearching
                
                return (
                  <div key={index} className="input-item">
                    <div className="input-header">
                      {isAskAgentMode && (
                        <input
                          type="checkbox"
                          className="input-checkbox"
                          checked={selectedInputs.has(input.name)}
                          onChange={() => handleToggleInput(input.name)}
                        />
                      )}
                      <span className="input-name">{input.name}</span>
                      <span className="input-type">{input.type}</span>
                    </div>
                    
                    <div className="input-derive-row">
                      <select
                        className="derive-method-select"
                        value={deriveMethod}
                        onChange={(e) => handleDeriveMethodChange(input.name, e.target.value as DeriveMethod)}
                        title={DERIVE_METHOD_DESCRIPTIONS[deriveMethod]}
                      >
                        {Object.entries(DERIVE_METHOD_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      
                      <input
                        type="text"
                        placeholder={isUserInput ? `Enter ${input.name}...` : DERIVE_METHOD_DESCRIPTIONS[deriveMethod]}
                        className={`input-field ${isReadOnly ? 'input-field-readonly' : ''}`}
                        value={inputValues[input.name] || ''}
                        onChange={(e) => handleInputChange(input.name, e.target.value)}
                        readOnly={isReadOnly}
                        title={input.intent}
                      />
                    </div>
                    
                    {showSuggestions && isUserInput && input.agentSuggestion && (
                      <div className="transaction-value-note">
                        <span className="agent-comment-text">
                          <StreamingText 
                            text={input.agentSuggestion}
                            speed={15}
                          />
                        </span>
                      </div>
                    )}
                    
                    {showSuggestions && needsAcceptance && input.agentSuggestion && (
                      <div className="input-suggestion-row">
                        <span className="suggestion-text">
                          <StreamingText 
                            text={input.agentSuggestion}
                            speed={15}
                          />
                        </span>
                        <div className="suggestion-actions">
                          <button
                            className="suggestion-accept"
                            onClick={() => handleAcceptDeriveMethod(input.name)}
                          >
                            Accept
                          </button>
                          <button
                            className="suggestion-reject"
                            onClick={() => handleRejectDeriveMethod(input.name)}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
            </div>
          </div>
        </>
      ) : (
        <div className="function-editor-test-mode">
          <div className="test-mode-content">
            <h3 className="test-mode-title">Test Mode</h3>
            <p className="test-mode-description">
              Test mode coming soon - you'll be able to simulate your action execution here.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

