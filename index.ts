import { config } from 'dotenv'
config()
import Safe, { EthersAdapter, SafeFactory } from '@safe-global/protocol-kit'
import { ethers } from 'ethers'
import { privateKeyToAddress } from 'viem/accounts'
import { Address, isAddress, parseUnits } from 'viem'
import { MetaTransactionData } from '@safe-global/safe-core-sdk-types'
import SafeApiKit from '@safe-global/api-kit'
import { etherscanLog } from './utils'

const apiKit = new SafeApiKit({
    chainId: BigInt(process.env.CHAIN_ID!),
})

const accountPrivateKeys: Address[] = [
    process.env.OWNER_1! as Address, // SEPOLIA testnet account with funds
    process.env.OWNER_2! as Address,
    process.env.OWNER_3! as Address,
]

const walletAddresses: Address[] = accountPrivateKeys.map((privateKey) => {
    return privateKeyToAddress(privateKey)
})

const provider = new ethers.InfuraProvider(
    process.env.INFURA_NETWORK,
    process.env.INFURA_KEY
)

const wallets = accountPrivateKeys.map((privateKey) => {
    return new ethers.Wallet(privateKey, provider)
})

const optionsDefinitions = [
    { name: 'safeAddress', type: String },
    { name: 'to', type: String },
    { name: 'tx', type: Boolean },
    { name: 'fundraising', type: Boolean },
    { name: 'amount', type: String },
]

const commandLineArgs = require('command-line-args')
const options = commandLineArgs(optionsDefinitions)

;(async () => {
    const ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: wallets[0],
    })

    if (options.safeAddress) {
        const safeSdk: Safe = await Safe.create({
            ethAdapter,
            safeAddress: options.safeAddress,
        })
        const safeAddress = await safeSdk.getAddress()
        console.log('safe address', safeAddress)
        if (options.tx && options.to && isAddress(options.to)) {
            const safeTransactionData: MetaTransactionData = {
                to: options.to,
                value: parseUnits(options.amount || '0.005', 18).toString(),
                data: '0x',
            }

            const safeTransaction = await safeSdk.createTransaction({
                transactions: [safeTransactionData],
            })
            const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
            console.log('tx hash', safeTxHash)

            const senderSignature = await safeSdk.signHash(safeTxHash)
            console.log('sender signature', senderSignature.data)
            console.log('sender address', walletAddresses[0])

            await apiKit.proposeTransaction({
                safeAddress,
                safeTransactionData: safeTransaction.data,
                safeTxHash,
                senderAddress: walletAddresses[0],
                senderSignature: senderSignature.data,
            })
            console.log('tx proposed')

            const pendingTransactions = (
                await apiKit.getPendingTransactions(safeAddress)
            ).results

            // Assumes that the first pending transaction is the transaction you want to confirm
            const transaction = pendingTransactions[0]
            const safeTxHash2 = transaction.safeTxHash
            etherscanLog({
                label: 'safe tx hash 2',
                route: 'address',
                hash: safeTxHash2,
            })

            const ethAdapterOwner2 = new EthersAdapter({
                ethers,
                signerOrProvider: wallets[1],
            })

            etherscanLog({
                label: 'Owner 2 address',
                route: 'address',
                hash: (await ethAdapterOwner2.getSignerAddress()) || '',
            })
            const protocolKitOwner2 = await Safe.create({
                ethAdapter: ethAdapterOwner2,
                safeAddress,
            })

            // NOTE confirming the transaction
            const signature = await protocolKitOwner2.signHash(safeTxHash2)
            const response = await apiKit.confirmTransaction(
                safeTxHash2,
                signature.data
            )
            console.log('tx confirmed', response.signature)

            // NOTE executing the transaction
            const safeTxHash3 = await apiKit.getTransaction(safeTxHash)
            etherscanLog({
                label: 'safe tx hash 3',
                hash: safeTxHash3.safeTxHash,
            })
            const executeTxResponse =
                await safeSdk.executeTransaction(safeTxHash3)
            const receipt = await executeTxResponse.transactionResponse?.wait()

            etherscanLog({
                label: 'Transaction executed:',
                hash: receipt?.hash || '',
            })
        } else if (options.fundraising) {
            const safeAmount = parseUnits(options.amount || '0.005', 18)

            const transactionParameters = {
                to: safeAddress,
                value: safeAmount,
            }

            const tx = await wallets[0].sendTransaction(transactionParameters)

            etherscanLog({ label: 'Deposit Transaction', hash: tx.hash })
        }
    } else {
        const ethAdapter = new EthersAdapter({
            ethers,
            signerOrProvider: wallets[0],
        })

        // NOTE Deploy new safe
        const safeFactory = await SafeFactory.create({ ethAdapter })

        const protocolKitOwner1 = await safeFactory.deploySafe({
            safeAccountConfig: {
                owners: walletAddresses,
                threshold: 2,
            },
        })
        const safeAddress = await protocolKitOwner1.getAddress()
        console.log('Your Safe has been deployed:')
        console.log(`https://sepolia.etherscan.io/address/${safeAddress}`)
        console.log(`https://app.safe.global/sep:${safeAddress}`)
    }
})()
