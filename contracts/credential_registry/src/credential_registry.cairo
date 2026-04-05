use starknet::ContractAddress;

#[starknet::interface]
pub trait ICredentialRegistry<TContractState> {
    fn verify_credential(
        ref self: TContractState,
        user: ContractAddress,
        proof: Span<felt252>,
        passport_root: u256,
        nullifier: u256,
        name_hash: u256,
        doc_num_hash: u256,
        birth_year: u32,
        expiry_date: u32
    );
    fn is_address_verified(self: @TContractState, user: ContractAddress) -> bool;
    fn get_nullifier_owner(self: @TContractState, nullifier: u256) -> ContractAddress;
    fn get_user_birth_year(self: @TContractState, user: ContractAddress) -> u32;
}


#[starknet::contract]
pub mod CredentialRegistry {
    use starknet::{ContractAddress, get_block_timestamp};
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::introspection::src5::SRC5Component;
    use verifier::honk_verifier::{
        IUltraKeccakZKHonkVerifierDispatcher, IUltraKeccakZKHonkVerifierDispatcherTrait
    };

    use starknet::storage::{StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use core::array::SpanTrait;
    use core::num::traits::Zero;

    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[abi(embed_v0)]
    impl AccessControlImpl = AccessControlComponent::AccessControlImpl<ContractState>;
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;
    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    pub const ISSUER_MANAGER_ROLE: felt252 = selector!("ISSUER_MANAGER_ROLE");

    #[storage]
    struct Storage {
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,

        verifier_address: ContractAddress,
        nullifier_owners: starknet::storage::Map<u256, ContractAddress>,
        verified_addresses: starknet::storage::Map<ContractAddress, bool>,
        user_birth_years: starknet::storage::Map<ContractAddress, u32>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        AccessControlEvent: AccessControlComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        CredentialVerified: CredentialVerified,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CredentialVerified {
        #[key]
        pub user: ContractAddress,
        pub nullifier: u256,
        pub birth_year: u32,
        pub timestamp: u64,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        verifier: ContractAddress,
        admin: ContractAddress,
    ) {
        self.verifier_address.write(verifier);
        self.accesscontrol.initializer();
        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, admin);
        self.accesscontrol._grant_role(ISSUER_MANAGER_ROLE, admin);
    }

    #[abi(embed_v0)]
    impl CredentialRegistryImpl of super::ICredentialRegistry<ContractState> {
        fn verify_credential(
            ref self: ContractState,
            user: ContractAddress,
            proof: Span<felt252>,
            passport_root: u256,
            nullifier: u256,
            name_hash: u256,
            doc_num_hash: u256,
            birth_year: u32,
            expiry_date: u32,
        ) {
            // Require caller to be an authorized issuer
            self.accesscontrol.assert_only_role(ISSUER_MANAGER_ROLE);

            // Has user already done KYC?
            assert(!self.verified_addresses.read(user), 'User already verified');

            let verifier_addr = self.verifier_address.read();
            let dispatcher = IUltraKeccakZKHonkVerifierDispatcher {
                contract_address: verifier_addr
            };

            // Call verifier - returns Result<Span<u256>, felt252>
            let result_opt = dispatcher.verify_ultra_keccak_zk_honk_proof(proof);
            assert(result_opt.is_ok(), 'Invalid Proof');

            let public_inputs: Span<u256> = ResultTrait::unwrap(result_opt);

            // Circuit returns 6 explicit public inputs
            assert(public_inputs.len() == 6, 'Invalid pub inputs len');
            
            let v_root = *public_inputs.at(0);
            let v_nullifier = *public_inputs.at(1);
            let v_name_hash = *public_inputs.at(2);
            let v_doc_num_hash = *public_inputs.at(3);
            let v_birth_year = (*public_inputs.at(4)).try_into().unwrap();
            let v_expiry_date = (*public_inputs.at(5)).try_into().unwrap();

            // Verify inputs match provided values
            assert(v_root == passport_root, 'Root Mismatch');
            assert(v_nullifier == nullifier, 'Nullifier Mismatch');
            assert(v_name_hash == name_hash, 'NameHash Mismatch');
            assert(v_doc_num_hash == doc_num_hash, 'DocNumHash Mismatch');
            assert(v_birth_year == birth_year, 'BirthYear Mismatch');
            assert(v_expiry_date == expiry_date, 'Expiry Mismatch');

            // Optional: On-chain expiry check
            // Format is YYMMDD. 
            // In a real app we'd convert current timestamp to YYMMDD, 
            // but for now we trust the issuer logic or future on-chain helpers.

            // Ensures document nullifier hasn't been used yet
            let existing_owner = self.nullifier_owners.read(nullifier);
            assert(existing_owner.is_zero(), 'Document already used');

            // Bind to wallet
            self.nullifier_owners.write(nullifier, user);
            self.verified_addresses.write(user, true);
            self.user_birth_years.write(user, birth_year);

            // Emitting event natively
            self.emit(
                CredentialVerified {
                    user,
                    nullifier,
                    birth_year,
                    timestamp: get_block_timestamp(),
                },
            );
        }

        fn is_address_verified(self: @ContractState, user: ContractAddress) -> bool {
            self.verified_addresses.read(user)
        }

        fn get_nullifier_owner(self: @ContractState, nullifier: u256) -> ContractAddress {
            self.nullifier_owners.read(nullifier)
        }

        fn get_user_birth_year(self: @ContractState, user: ContractAddress) -> u32 {
            self.user_birth_years.read(user)
        }
    }
}
