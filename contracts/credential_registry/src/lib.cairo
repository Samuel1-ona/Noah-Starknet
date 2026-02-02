#[starknet::interface]
pub trait ICredentialRegistry<TContractState> {
    fn verify_credential(
        ref self: TContractState,
        proof: Span<felt252>,
        current_year: u256
    );
    fn add_jurisdiction_root(ref self: TContractState, root: u256);
    fn add_membership_root(ref self: TContractState, root: u256);
}

#[starknet::contract]
mod CredentialRegistry {
    use starknet::ContractAddress;
    use starknet::storage::{Map, StoragePointerReadAccess, StoragePointerWriteAccess};
    use verifier::honk_verifier::{IUltraStarknetHonkVerifierDispatcher, IUltraStarknetHonkVerifierDispatcherTrait};

    #[storage]
    struct Storage {
        verifier_address: ContractAddress,
        jurisdiction_roots: Map<u256, bool>,
        membership_roots: Map<u256, bool>,
        nullifiers: Map<u256, bool>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, verifier: ContractAddress) {
        self.verifier_address.write(verifier);
    }

    #[abi(embed_v0)]
    impl CredentialRegistryImpl of super::ICredentialRegistry<ContractState> {
        fn add_jurisdiction_root(ref self: ContractState, root: u256) {
            // In real app, check owner or access control
            self.jurisdiction_roots.write(root, true);
        }
        
        fn add_membership_root(ref self: ContractState, root: u256) {
            self.membership_roots.write(root, true);
        }

        fn verify_credential(
            ref self: ContractState,
            proof: Span<felt252>,
            current_year: u256
        ) {
            let verifier_addr = self.verifier_address.read();
            let dispatcher = IUltraStarknetHonkVerifierDispatcher { contract_address: verifier_addr };

            // Call verifier
            // returns Option<Span<u256>>
            let result_opt = dispatcher.verify_ultra_starknet_honk_proof(proof);
            assert(result_opt.is_some(), 'Invalid Proof');
            
            let public_inputs = result_opt.unwrap();
            
            // Expected public inputs based on circuit:
            // 0: jurisdiction_root
            // 1: membership_root
            // 2: action_id
            // 3: nullifier
            // 4: current_year
            
            assert(public_inputs.len() == 5, 'Invalid pub inputs len');
            
            let jurisdiction_root = *public_inputs.at(0);
            let membership_root = *public_inputs.at(1);
            let _action_id = *public_inputs.at(2);
            let nullifier = *public_inputs.at(3);
            let pub_current_year = *public_inputs.at(4);

            // Check roots
            assert(self.jurisdiction_roots.read(jurisdiction_root), 'Invalid Jurisdiction');
            assert(self.membership_roots.read(membership_root), 'Invalid Membership');
            
            // Check Nullifier
            assert(!self.nullifiers.read(nullifier), 'Nullifier already used');
            self.nullifiers.write(nullifier, true);
            
            // Check current_year matches input
            assert(pub_current_year == current_year, 'Year mismatch');
        }
    }
}
