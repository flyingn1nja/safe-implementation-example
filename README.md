## Examples Commands
```bash
pnpm ts-node index.ts --safeAddress=<safe_address> --tx --to=<some_address>
```

## envs
```
OWNER_1=
OWNER_2=
OWNER_3=

INFURA_KEY=
INFURA_NETWORK=sepolia # you can change this if you like
CHAIN_ID=11155111 # you can change this if you like

ETHERSCAN_URL=https://sepolia.etherscan.io
EXISTING_SAFE_ADDRESS= # optional
```

## Create new safe account
`ONWER_1`, `OWNER_2`, `OWNER_3` are the addresses of the owners of the safe account

This command create a safe account
```bash
```bash
pnpm ts-node index.ts --threshold=3 #flag optional
```

## Safe Accounts
Go to safe [accounts](https://app.safe.global/welcome/accounts) and connect the app with your wallet
that you have used for safe account creation and it displays the safe address