import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { WalletIcon } from '../icons/WalletIcon'
import { Contract2Icon } from '../icons/Contract2Icon'
import { TransactionIcon } from '../icons/TransactionIcon'
import WalletSheet from './WalletSheet'
import TransactionSheet from './TransactionSheet'
import FunctionCard from './FunctionCard'
import ExamplesSheet from './ExamplesSheet'
import { mockTransactions } from '../data/mockTransactions'
import { Transaction, ContractFunction, SavedAction } from '../types'
import './SearchPage.css'

import { Wallet } from '../types'

interface SearchPageProps {
  savedWallets: Wallet[]
  onAddWallet: (address: string, name?: string) => void
  onDeleteWallet: (address: string) => void
  onWalletClick: (walletAddress: string) => void
  onFunctionClick: (func: ContractFunction, contractAddress: string, contractName?: string, contractIcon?: string, sourceTransaction?: Transaction) => void
  onContractClick?: (contractId: string) => void
  onSaveAction?: (action: SavedAction) => void
}

interface TransactionWithWallet extends Transaction {
  walletAddress: string
}

function TransactionTableRow({ 
  transaction, 
  walletName,
  onFunctionClick,
  onContractClick,
  onTxDetailsClick,
  onSeeExamples
}: { 
  transaction: TransactionWithWallet
  walletName: string
  onFunctionClick: (func: ContractFunction, contractAddress: string, contractName?: string, contractIcon?: string, sourceTransaction?: Transaction) => void
  onContractClick?: (contractId: string) => void
  onTxDetailsClick: (transaction: TransactionWithWallet) => void
  onSeeExamples: (func: ContractFunction, contractName: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatTokenTransfer = (tx: Transaction) => {
    if (tx.secondaryAsset) {
      return `${tx.primaryAsset.amount} ${tx.primaryAsset.symbol} → ${tx.secondaryAsset.amount} ${tx.secondaryAsset.symbol}`
    }
    return `${tx.primaryAsset.amount} ${tx.primaryAsset.symbol}`
  }

  return (
    <>
      <tr className="table-row" onClick={() => setIsExpanded(!isExpanded)}>
        <td className="table-cell">
          <div className="table-cell-with-icon">
            <button 
              className="tx-details-button"
              onClick={(e) => {
                e.stopPropagation()
                onTxDetailsClick(transaction)
              }}
            >
              <TransactionIcon size={16} fill="#9333EA" />
            </button>
            <button className="expand-button">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <span className="wallet-cell">{walletName}</span>
          </div>
        </td>
        <td className="table-cell">
          {transaction.contracts?.[0] ? (
            <button 
              className="contract-cell-button"
              onClick={(e) => {
                e.stopPropagation()
                onContractClick?.(transaction.contracts![0].address)
              }}
            >
              <Contract2Icon size={18} fill="#9333EA" />
              <span className="contract-name-text">{transaction.contracts[0].name}</span>
            </button>
          ) : (
            <span className="contract-cell-empty">-</span>
          )}
        </td>
        <td className="table-cell">
          <div className="token-transfer-cell">
            {formatTokenTransfer(transaction)}
          </div>
        </td>
        <td className="table-cell">
          <div className="time-cell">{transaction.timestamp}</div>
        </td>
      </tr>
      {isExpanded && transaction.contracts && (
        <tr className="expanded-row">
          <td colSpan={4}>
            <div className="expanded-content">
              {transaction.contracts.map((contract) => (
                  <div className="functions-grid">
                  {contract.functions.map((func) => {
                    const hasExamples = func.variants && func.variants.length > 0
                    return (
                      <div key={func.id} className="function-card-wrapper">
                        <FunctionCard
                          contractName={contract.name}
                          func={func}
                          onContractClick={() => onContractClick?.(contract.address)}
                        />
                        <button
                          className="create-action-button-small"
                          onClick={(e) => {
                            e.stopPropagation()
                            onFunctionClick(func, contract.address, contract.name, undefined, transaction)
                          }}
                        >
                          Create Action
                        </button>
                        {hasExamples && (
                          <button
                            className="see-examples-button-small"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSeeExamples(func, contract.name)
                            }}
                          >
                            Examples
                          </button>
                        )}
                      </div>
                    )
                  })}
                  </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function SearchPage({ 
  savedWallets, 
  onAddWallet, 
  onDeleteWallet, 
  onWalletClick, 
  onFunctionClick, 
  onContractClick,
  onSaveAction
}: SearchPageProps) {
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false)
  const [isTransactionSheetOpen, setIsTransactionSheetOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithWallet | null>(null)
  const [walletFilter, setWalletFilter] = useState<string | null>(null)
  const [examplesSheetOpen, setExamplesSheetOpen] = useState(false)
  const [selectedFunction, setSelectedFunction] = useState<{ func: ContractFunction; contractName: string } | null>(null)

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // For demo purposes, assign each transaction to a tracked wallet
  const transactionsWithWallets: TransactionWithWallet[] = mockTransactions
    .map((tx, idx) => ({
      ...tx,
      walletAddress: savedWallets[idx % savedWallets.length]?.address || savedWallets[0]?.address
    }))
    .filter(tx => savedWallets.some(w => w.address === tx.walletAddress))

  const handleTxDetailsClick = (transaction: TransactionWithWallet) => {
    setSelectedTransaction(transaction)
    setIsTransactionSheetOpen(true)
  }

  const handleSeeExamples = (func: ContractFunction, contractName: string) => {
    setSelectedFunction({ func, contractName })
    setExamplesSheetOpen(true)
  }

  const handleSelectExample = (action: SavedAction) => {
    if (onSaveAction) {
      onSaveAction(action)
    }
  }

  return (
    <>
      <div className="search-page">
        <div className="search-page-header">
          <div className="search-page-header-left">
            <h3>Create Actions From Transactions</h3>
            <p className="search-page-header-subtitle">
              View transaction activity and create reusable onchain actions
            </p>
          </div>
          <button
            className="tracked-wallets-button"
            onClick={() => setIsWalletSheetOpen(true)}
          >
            <WalletIcon size={18} fill="#9333EA" />
            <span>Tracked Wallets ({savedWallets.length})</span>
          </button>
        </div>

        <div className="search-page-content">
          <div className="transactions-table-container">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th className="table-header">Wallet</th>
                  <th className="table-header">Called</th>
                  <th className="table-header">Token Transfers</th>
                  <th className="table-header">Time</th>
                </tr>
              </thead>
              <tbody>
                {transactionsWithWallets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-state">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactionsWithWallets.map((tx) => (
                    <TransactionTableRow
                      key={tx.id}
                      transaction={tx}
                      walletName={savedWallets.find(w => w.address === tx.walletAddress)?.name || formatAddress(tx.walletAddress)}
                    onFunctionClick={onFunctionClick}
                    onContractClick={onContractClick}
                    onTxDetailsClick={handleTxDetailsClick}
                    onSeeExamples={handleSeeExamples}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <WalletSheet
        isOpen={isWalletSheetOpen}
        onClose={() => setIsWalletSheetOpen(false)}
        wallets={savedWallets}
        onAddWallet={onAddWallet}
        onDeleteWallet={onDeleteWallet}
        onWalletClick={onWalletClick}
      />

      <TransactionSheet
        isOpen={isTransactionSheetOpen}
        onClose={() => setIsTransactionSheetOpen(false)}
        transaction={selectedTransaction}
        walletName={selectedTransaction ? (savedWallets.find(w => w.address === selectedTransaction.walletAddress)?.name || formatAddress(selectedTransaction.walletAddress)) : ''}
        onFunctionClick={onFunctionClick}
        onContractClick={onContractClick}
      />

      {selectedFunction && (
        <ExamplesSheet
          isOpen={examplesSheetOpen}
          onClose={() => {
            setExamplesSheetOpen(false)
            setSelectedFunction(null)
          }}
          func={selectedFunction.func}
          contractName={selectedFunction.contractName}
          onSelectExample={handleSelectExample}
        />
      )}
    </>
  )
}
