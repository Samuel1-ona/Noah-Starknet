#!/bin/bash
set -ex

# 1. Load variables from .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found."
    exit 1
fi

echo "[Noah] Starting Final Sepolia Deployment (Deployer: $ADMIN_CONTRACT_ADDRESS)"

# 2. Re-create snfoundry.toml profile for deployer
echo "[sncast.testnet]
url = \"$SEPOLIA_RPC\"
accounts-file = \"accounts_testnet.json\"
account = \"deployer\"
fee-token = \"strk\"" > snfoundry.toml

# 3. Create/Update accounts_testnet.json with your new Private Key
# Note: We use the public key from your starkli account.json (0x5d6c...423)
python3 -c "import json, os; 
accounts = {'alpha-sepolia': {
    'deployer': {
        'address': os.environ['ADMIN_CONTRACT_ADDRESS'],
        'private_key': os.environ['ADMIN_PRIVATE_KEY'],
        'public_key': '0x5d6cbfa2b4272e215c9319949aafa5929b8e5a6f572c10f8216b142016e5423',
        'type': 'argent'
    }
}};
with open('accounts_testnet.json', 'w') as f: json.dump(accounts, f, indent=4)"

# 4. Declare Verifier
echo "[Noah] Declaring Verifier..."
VERIFIER_DECL_OUT=$(sncast --profile testnet --wait declare --contract-name UltraKeccakZKHonkVerifier --package verifier)
VERIFIER_CLASS_HASH=$(echo "$VERIFIER_DECL_OUT" | grep "class_hash" | awk '{print $NF}')
echo "[Noah] Verifier Class Hash: $VERIFIER_CLASS_HASH"

# 5. Deploy Verifier
echo "[Noah] Deploying Verifier..."
VERIFIER_DEP_OUT=$(sncast --profile testnet --wait deploy --contract-name UltraKeccakZKHonkVerifier --package verifier)
VERIFIER_ADDR=$(echo "$VERIFIER_DEP_OUT" | grep "contract_address" | awk '{print $NF}')
echo "[Noah] Verifier Address: $VERIFIER_ADDR"

# 6. Declare Registry
echo "[Noah] Declaring CredentialRegistry..."
REGISTRY_DECL_OUT=$(sncast --profile testnet --wait declare --contract-name CredentialRegistry --package credential_registry)
REGISTRY_CLASS_HASH=$(echo "$REGISTRY_DECL_OUT" | grep "class_hash" | awk '{print $NF}')
echo "[Noah] Registry Class Hash: $REGISTRY_CLASS_HASH"

# 7. Deploy Registry
# Constructor Arguments: (verifier: Address, admin: Address)
echo "[Noah] Deploying CredentialRegistry..."
REGISTRY_DEP_OUT=$(sncast --profile testnet --wait deploy --contract-name CredentialRegistry --constructor-calldata $VERIFIER_ADDR $ADMIN_CONTRACT_ADDRESS --package credential_registry)
REGISTRY_ADDR=$(echo "$REGISTRY_DEP_OUT" | grep "contract_address" | awk '{print $NF}')
echo "[Noah] Registry Address: $REGISTRY_ADDR"

# 8. Update Record
cat <<EOF > contract_testnet.json
{
    "network": "sepolia",
    "verifier_address": "$VERIFIER_ADDR",
    "registry_address": "$REGISTRY_ADDR",
    "account_address": "$ADMIN_CONTRACT_ADDRESS",
    "rpc_url": "$SEPOLIA_RPC"
}
EOF

echo "[Noah] SUCCESS!"
echo "Verifier: $VERIFIER_ADDR"
echo "Registry: $REGISTRY_ADDR"
