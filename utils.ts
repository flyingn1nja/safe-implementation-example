import process from 'process'

export const etherscanLog = ({
    route = 'tx',
    label,
    hash,
}: {
    label: string
    hash: string
    route?: 'tx' | 'address'
}) => console.log(`${label}: ${process.env.ETHERSCAN_URL}/${route}/${hash}`)
