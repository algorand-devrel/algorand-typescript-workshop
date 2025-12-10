import {
  Account,
  assert,
  BoxMap,
  Contract,
  Global,
  gtxn,
  itxn,
  Txn,
  uint64,
} from '@algorandfoundation/algorand-typescript'

export class PersonalBank extends Contract {
  public depositors = BoxMap<Account, uint64>({ keyPrefix: 'depositors' })

  /**
   * Deposits funds into the personal bank.
   * The deposit amount is recorded in the sender's BoxMap.
   * If the sender already has a deposit, the amount is added to their existing balance.
   * @param payTxn - The payment transaction containing deposit information
   * @returns The total amount deposited by the sender after this transaction
   */
  public deposit(payTxn: gtxn.PaymentTxn) {
    assert(payTxn.receiver === Global.currentApplicationAddress, 'Receiver must be the contract address')
    assert(payTxn.amount > 0, 'Deposit amount must be greater than zero')

    const depositAmount = payTxn.amount
    const isDeposited = this.depositors(payTxn.sender).exists

    if (isDeposited) {
      this.depositors(payTxn.sender).value += depositAmount
    } else {
      this.depositors(payTxn.sender).value = depositAmount
    }

    return this.depositors(payTxn.sender).value
  }

  /**
   * Withdraws all funds from the sender's account.
   * This method transfers the entire balance of the sender's account back to them,
   * and resets their balance to zero. The sender must have a deposit to withdraw.
   * @returns The amount withdrawn (as UInt64)
   */
  public withdraw() {
    const [depositedAmount, isDeposited] = this.depositors(Txn.sender).maybe()
    assert(isDeposited, 'No deposits found for this account')

    const result = itxn
      .payment({
        receiver: Txn.sender,
        amount: depositedAmount,
        fee: 0,
      })
      .submit()

    this.depositors(Txn.sender).value = 0

    return result.amount
  }
}
