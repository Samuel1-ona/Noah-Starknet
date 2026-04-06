#[starknet::interface]
pub trait IProtocolAccessControl<TContractState> {
    fn check_access(self: @TContractState, protocol: starknet::ContractAddress, user: starknet::ContractAddress) -> bool;
    fn grant_access(ref self: TContractState, user: starknet::ContractAddress);
    fn revoke_access(ref self: TContractState, user: starknet::ContractAddress);
}

#[starknet::contract]
pub mod ProtocolAccessControl {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use super::super::credential_registry::{ICredentialRegistryDispatcher, ICredentialRegistryDispatcherTrait};
    use starknet::storage::{StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        credential_registry_address: ContractAddress,
        has_access: starknet::storage::Map<(ContractAddress, ContractAddress), bool>, // (protocol, user) -> bool
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        AccessGranted: AccessGranted,
        AccessRevoked: AccessRevoked,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AccessGranted {
        #[key]
        pub user: ContractAddress,
        #[key]
        pub protocol: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AccessRevoked {
        #[key]
        pub user: ContractAddress,
        #[key]
        pub protocol: ContractAddress,
        pub timestamp: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, credential_registry: ContractAddress) {
        self.credential_registry_address.write(credential_registry);
    }

    #[abi(embed_v0)]
    impl ProtocolAccessControlImpl of super::IProtocolAccessControl<ContractState> {
        fn grant_access(ref self: ContractState, user: ContractAddress) {
            let caller = get_caller_address();
            let registry_addr = self.credential_registry_address.read();
            let dispatcher = ICredentialRegistryDispatcher { contract_address: registry_addr };

            assert(!dispatcher.is_paused(), 'Registry paused');

            // Ensure the user has completed global KYC
            let is_verified = dispatcher.is_address_verified(user);
            assert(is_verified, 'User failed global KYC');

            // Grant access
            self.has_access.write((caller, user), true);

            self.emit(AccessGranted {
                user,
                protocol: caller,
                timestamp: get_block_timestamp(),
            });
        }

        fn revoke_access(ref self: ContractState, user: ContractAddress) {
            let caller = get_caller_address();
            assert(self.has_access.read((caller, user)), 'User does not have access');
            self.has_access.write((caller, user), false);

            self.emit(AccessRevoked {
                user,
                protocol: caller,
                timestamp: get_block_timestamp(),
            });
        }

        fn check_access(self: @ContractState, protocol: ContractAddress, user: ContractAddress) -> bool {
            if !self.has_access.read((protocol, user)) {
                return false;
            }

            let registry_addr = self.credential_registry_address.read();
            let dispatcher = ICredentialRegistryDispatcher { contract_address: registry_addr };
            if dispatcher.is_paused() {
                return false;
            }
            dispatcher.is_address_verified(user)
        }
    }
}
