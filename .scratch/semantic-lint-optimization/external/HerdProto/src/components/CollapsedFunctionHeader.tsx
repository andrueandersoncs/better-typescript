import { Contract2Icon } from '../icons/Contract2Icon'
import { ContractFunction } from '../types'
import './CollapsedFunctionHeader.css'

interface CollapsedFunctionHeaderProps {
  contractName: string
  contractIcon?: string
  func: ContractFunction
  stepNumber?: number
  contractId?: string
  onContractClick?: (contractId: string) => void
}

export default function CollapsedFunctionHeader({ 
  contractName, 
  contractIcon: _contractIcon,
  func,
  stepNumber,
  contractId,
  onContractClick
}: CollapsedFunctionHeaderProps) {
  return (
    <div className="collapsed-function-header">
      {stepNumber && <span className="step-number">Step {stepNumber} -</span>}
      {onContractClick && contractId ? (
        <button 
          className="collapsed-contract-button"
          onClick={(e) => {
            e.stopPropagation()
            onContractClick(contractId)
          }}
        >
          <span className="collapsed-icon"><Contract2Icon size={16} fill="#9333EA" /></span>
          <span className="collapsed-contract-name">{contractName}.</span>
        </button>
      ) : (
        <>
          <span className="collapsed-icon"><Contract2Icon size={16} fill="#9333EA" /></span>
          <span className="collapsed-contract-name">{contractName}.</span>
        </>
      )}
      <span className="collapsed-function-name">{func.name}</span>
    </div>
  )
}

