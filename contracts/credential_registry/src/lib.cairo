use starknet::ContractAddress;

#[starknet::interface]
pub trait ICredentialRegistry<TContractState> {
    // Core verification
    fn verify_credential(
        ref self: TContractState,
        proof: Span<felt252>,
        current_year: u256,
        current_month: u256,
        current_day: u256,
        min_age: u256
    );
    
    // Root management
    fn add_jurisdiction_root(ref self: TContractState, root: u256);
    fn add_membership_root(ref self: TContractState, root: u256);
    fn add_jurisdiction_roots_batch(ref self: TContractState, roots: Span<u256>);
    fn add_membership_roots_batch(ref self: TContractState, roots: Span<u256>);
    fn remove_jurisdiction_root(ref self: TContractState, root: u256);
    fn remove_membership_root(ref self: TContractState, root: u256);
    
    // Query functions
    fn is_jurisdiction_root_valid(self: @TContractState, root: u256) -> bool;
    fn is_membership_root_valid(self: @TContractState, root: u256) -> bool;
    fn is_nullifier_used(self: @TContractState, nullifier: u256) -> bool;
    fn get_owner(self: @TContractState) -> ContractAddress;
    fn is_paused(self: @TContractState) -> bool;
    
    // Access control
    fn transfer_ownership(ref self: TContractState, new_owner: ContractAddress);
    
    // Pausable
    fn pause(ref self: TContractState);
    fn unpause(ref self: TContractState);
}

#[starknet::contract]
mod CredentialRegistry {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{Map, StoragePointerReadAccess, StoragePointerWriteAccess};
    use verifier::honk_verifier::{IUltraStarknetHonkVerifierDispatcher, IUltraStarknetHonkVerifierDispatcherTrait};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        verifier_address: ContractAddress,
        jurisdiction_roots: Map<u256, bool>,
        membership_roots: Map<u256, bool>,
        nullifiers: Map<u256, bool>,
        paused: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        CredentialVerified: CredentialVerified,
        JurisdictionRootAdded: JurisdictionRootAdded,
        MembershipRootAdded: MembershipRootAdded,
        JurisdictionRootRemoved: JurisdictionRootRemoved,
        MembershipRootRemoved: MembershipRootRemoved,
        OwnershipTransferred: OwnershipTransferred,
        Paused: Paused,
        Unpaused: Unpaused,
    }

    #[derive(Drop, starknet::Event)]
    struct CredentialVerified {
        #[key]
        nullifier: u256,
        action_id: u256,
        min_age: u256,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct JurisdictionRootAdded {
        root: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct MembershipRootAdded {
        root: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct JurisdictionRootRemoved {
        root: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct MembershipRootRemoved {
        root: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct OwnershipTransferred {
        previous_owner: ContractAddress,
        new_owner: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct Paused {}

    #[derive(Drop, starknet::Event)]
    struct Unpaused {}

    #[constructor]
    fn constructor(ref self: ContractState, verifier: ContractAddress, owner: ContractAddress) {
        self.verifier_address.write(verifier);
        self.owner.write(owner);
        self.paused.write(false);
    }

    // Internal helper functions
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn assert_only_owner(self: @ContractState) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Caller is not owner');
        }

        fn assert_not_paused(self: @ContractState) {
            assert(!self.paused.read(), 'Contract is paused');
        }
    }

    #[abi(embed_v0)]
    impl CredentialRegistryImpl of super::ICredentialRegistry<ContractState> {
        // Root management
        fn add_jurisdiction_root(ref self: ContractState, root: u256) {
            self.assert_only_owner();
            self.jurisdiction_roots.write(root, true);
            self.emit(JurisdictionRootAdded { root });
        }
        
        fn add_membership_root(ref self: ContractState, root: u256) {
            self.assert_only_owner();
            self.membership_roots.write(root, true);
            self.emit(MembershipRootAdded { root });
        }

        fn add_jurisdiction_roots_batch(ref self: ContractState, roots: Span<u256>) {
            self.assert_only_owner();
            let mut i: u32 = 0;
            loop {
                if i >= roots.len() {
                    break;
                }
                let root = *roots.at(i);
                self.jurisdiction_roots.write(root, true);
                self.emit(JurisdictionRootAdded { root });
                i += 1;
            }
        }

        fn add_membership_roots_batch(ref self: ContractState, roots: Span<u256>) {
            self.assert_only_owner();
            let mut i: u32 = 0;
            loop {
                if i >= roots.len() {
                    break;
                }
                let root = *roots.at(i);
                self.membership_roots.write(root, true);
                self.emit(MembershipRootAdded { root });
                i += 1;
            }
        }

        fn remove_jurisdiction_root(ref self: ContractState, root: u256) {
            self.assert_only_owner();
            self.jurisdiction_roots.write(root, false);
            self.emit(JurisdictionRootRemoved { root });
        }

        fn remove_membership_root(ref self: ContractState, root: u256) {
            self.assert_only_owner();
            self.membership_roots.write(root, false);
            self.emit(MembershipRootRemoved { root });
        }

        // Query functions
        fn is_jurisdiction_root_valid(self: @ContractState, root: u256) -> bool {
            self.jurisdiction_roots.read(root)
        }

        fn is_membership_root_valid(self: @ContractState, root: u256) -> bool {
            self.membership_roots.read(root)
        }

        fn is_nullifier_used(self: @ContractState, nullifier: u256) -> bool {
            self.nullifiers.read(nullifier)
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn is_paused(self: @ContractState) -> bool {
            self.paused.read()
        }

        // Access control
        fn transfer_ownership(ref self: ContractState, new_owner: ContractAddress) {
            self.assert_only_owner();
            let previous_owner = self.owner.read();
            self.owner.write(new_owner);
            self.emit(OwnershipTransferred { previous_owner, new_owner });
        }

        // Pausable
        fn pause(ref self: ContractState) {
            self.assert_only_owner();
            assert(!self.paused.read(), 'Already paused');
            self.paused.write(true);
            self.emit(Paused {});
        }

        fn unpause(ref self: ContractState) {
            self.assert_only_owner();
            assert(self.paused.read(), 'Not paused');
            self.paused.write(false);
            self.emit(Unpaused {});
        }

        // Core verification
        fn verify_credential(
            ref self: ContractState,
            proof: Span<felt252>,
            current_year: u256,
            current_month: u256,
            current_day: u256,
            min_age: u256
        ) {
            self.assert_not_paused();
            
            let verifier_addr = self.verifier_address.read();
            let dispatcher = IUltraStarknetHonkVerifierDispatcher { contract_address: verifier_addr };

            // Call verifier - returns Option<Span<u256>>
            let result_opt = dispatcher.verify_ultra_starknet_honk_proof(proof);
            assert(result_opt.is_some(), 'Invalid Proof');
            
            let public_inputs = result_opt.unwrap();
            
            // Expected public inputs based on updated circuit (8 inputs):
            // 0: jurisdiction_root
            // 1: membership_root
            // 2: action_id
            // 3: nullifier
            // 4: current_year
            // 5: current_month
            // 6: current_day
            // 7: min_age (NEW)
            
            assert(public_inputs.len() == 8, 'Invalid pub inputs len');
            
            let jurisdiction_root = *public_inputs.at(0);
            let membership_root = *public_inputs.at(1);
            let action_id = *public_inputs.at(2);
            let nullifier = *public_inputs.at(3);
            let pub_current_year = *public_inputs.at(4);
            let pub_current_month = *public_inputs.at(5);
            let pub_current_day = *public_inputs.at(6);
            let pub_min_age = *public_inputs.at(7);

            // Check roots are valid
            assert(self.jurisdiction_roots.read(jurisdiction_root), 'Invalid Jurisdiction');
            assert(self.membership_roots.read(membership_root), 'Invalid Membership');
            
            // Check nullifier hasn't been used
            assert(!self.nullifiers.read(nullifier), 'Nullifier already used');
            self.nullifiers.write(nullifier, true);
            
            // Check current date matches input
            assert(pub_current_year == current_year, 'Year mismatch');
            assert(pub_current_month == current_month, 'Month mismatch');
            assert(pub_current_day == current_day, 'Day mismatch');
            
            // Check min_age matches input
            assert(pub_min_age == min_age, 'Min age mismatch');
            
            // Emit event
            self.emit(CredentialVerified {
                nullifier,
                action_id,
                min_age,
                timestamp: get_block_timestamp(),
            });
        }
    }
}
