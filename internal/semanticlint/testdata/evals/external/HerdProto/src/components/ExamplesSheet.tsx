import { X } from 'lucide-react'
import { SavedAction, ContractFunction } from '../types'
import ActionCard from './ActionCard'
import './ExamplesSheet.css'

interface ExamplesSheetProps {
  isOpen: boolean
  onClose: () => void
  func: ContractFunction
  contractName: string
  onSelectExample: (action: SavedAction) => void
}

export default function ExamplesSheet({
  isOpen,
  onClose,
  func,
  contractName,
  onSelectExample
}: ExamplesSheetProps) {
  if (!isOpen) return null

  const examples = func.variants || []

  return (
    <>
      <div className="examples-sheet-backdrop" onClick={onClose} />
      <div className="examples-sheet">
        <div className="examples-sheet-header">
          <div className="examples-sheet-header-content">
            <h2 className="examples-sheet-title">
              Examples of {func.name}()
            </h2>
            <p className="examples-sheet-subtitle">
              {contractName} • {examples.length} example{examples.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            className="examples-sheet-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="examples-sheet-content">
          {examples.length === 0 ? (
            <div className="examples-empty-state">
              <p>No examples yet</p>
              <p className="examples-empty-subtitle">
                Examples are different ways people have implemented this function
              </p>
            </div>
          ) : (
            <div className="examples-list">
              {examples.map((example) => (
                <div
                  key={example.id}
                  className="example-item"
                  onClick={() => {
                    onSelectExample(example)
                    onClose()
                  }}
                >
                  <ActionCard
                    name={example.name}
                    description={example.description}
                    createdBy={example.createdBy}
                    variant="compact"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

