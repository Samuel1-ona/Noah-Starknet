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
        expiry_date: u32,
    );
    fn revoke_credential(ref self: TContractState, user: ContractAddress);
    fn update_verifier(ref self: TContractState, new_verifier: ContractAddress);
    fn get_verifier(self: @TContractState) -> ContractAddress;
    fn pause(ref self: TContractState);
    fn unpause(ref self: TContractState);
    fn is_paused(self: @TContractState) -> bool;
    fn grant_issuer_manager(ref self: TContractState, account: ContractAddress);
    fn revoke_issuer_manager(ref self: TContractState, account: ContractAddress);
    fn grant_admin(ref self: TContractState, account: ContractAddress);
    fn revoke_admin(ref self: TContractState, account: ContractAddress);
    fn is_address_verified(self: @TContractState, user: ContractAddress) -> bool;
    fn get_nullifier_owner(self: @TContractState, nullifier: u256) -> ContractAddress;
}

#[starknet::contract]
pub mod CredentialRegistry {
    use core::array::SpanTrait;
    use core::num::traits::Zero;
    use openzeppelin::access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin::introspection::src5::SRC5Component;
    use starknet::storage::{
        StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use verifier::honk_verifier::{
        IUltraKeccakZKHonkVerifierDispatcher, IUltraKeccakZKHonkVerifierDispatcherTrait,
    };

    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    impl AccessControlImpl = AccessControlComponent::AccessControlImpl<ContractState>;
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;
    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    pub const ISSUER_MANAGER_ROLE: felt252 = selector!("ISSUER_MANAGER_ROLE");

    #[derive(Copy, Drop)]
    struct CalendarDate {
        year: u32,
        month: u32,
        day: u32,
    }

    #[storage]
    struct Storage {
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,

        verifier_address: ContractAddress,
        paused: bool,
        admin_count: u32,
        nullifier_owners: starknet::storage::Map<u256, ContractAddress>,
        verified_addresses: starknet::storage::Map<ContractAddress, bool>,
        user_expiry_dates: starknet::storage::Map<ContractAddress, u32>,
        user_active_nullifiers: starknet::storage::Map<ContractAddress, u256>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        AccessControlEvent: AccessControlComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        CredentialVerified: CredentialVerified,
        CredentialRevoked: CredentialRevoked,
        VerifierUpdated: VerifierUpdated,
        RegistryPaused: RegistryPaused,
        RegistryUnpaused: RegistryUnpaused,
        AdminGranted: AdminGranted,
        AdminRevoked: AdminRevoked,
        IssuerManagerGranted: IssuerManagerGranted,
        IssuerManagerRevoked: IssuerManagerRevoked,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CredentialVerified {
        #[key]
        pub user: ContractAddress,
        pub nullifier: u256,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CredentialRevoked {
        #[key]
        pub user: ContractAddress,
        pub nullifier: u256,
        pub admin: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VerifierUpdated {
        pub old_verifier: ContractAddress,
        pub new_verifier: ContractAddress,
        pub admin: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RegistryPaused {
        pub admin: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RegistryUnpaused {
        pub admin: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AdminGranted {
        pub account: ContractAddress,
        pub admin: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AdminRevoked {
        pub account: ContractAddress,
        pub admin: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct IssuerManagerGranted {
        pub account: ContractAddress,
        pub admin: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct IssuerManagerRevoked {
        pub account: ContractAddress,
        pub admin: ContractAddress,
        pub timestamp: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, verifier: ContractAddress, admin: ContractAddress) {
        assert(!verifier.is_zero(), 'Zero verifier');
        assert(!admin.is_zero(), 'Zero account');

        self.verifier_address.write(verifier);
        self.paused.write(false);
        self.admin_count.write(1_u32);

        self.accesscontrol.initializer();
        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, admin);
        self.accesscontrol._grant_role(ISSUER_MANAGER_ROLE, admin);
    }

    fn assert_not_paused(self: @ContractState) {
        assert(!self.paused.read(), 'Paused');
    }

    fn is_leap_year(year: u32) -> bool {
        (year % 4_u32 == 0_u32 && year % 100_u32 != 0_u32) || year % 400_u32 == 0_u32
    }

    fn days_in_month(year: u32, month: u32) -> u32 {
        if month == 1_u32 || month == 3_u32 || month == 5_u32 || month == 7_u32
            || month == 8_u32 || month == 10_u32 || month == 12_u32 {
            31_u32
        } else if month == 4_u32 || month == 6_u32 || month == 9_u32 || month == 11_u32 {
            30_u32
        } else if month == 2_u32 {
            if is_leap_year(year) {
                29_u32
            } else {
                28_u32
            }
        } else {
            0_u32
        }
    }

    fn timestamp_to_calendar_date(timestamp: u64) -> CalendarDate {
        let days_since_unix_epoch = timestamp / 86400_u64;
        let z = days_since_unix_epoch + 719468_u64;
        let era = z / 146097_u64;
        let doe = z - era * 146097_u64;
        let yoe = (doe - doe / 1460_u64 + doe / 36524_u64 - doe / 146096_u64) / 365_u64;
        let mut year = yoe + era * 400_u64;
        let doy = doe - (365_u64 * yoe + yoe / 4_u64 - yoe / 100_u64);
        let mp = (5_u64 * doy + 2_u64) / 153_u64;
        let day = doy - (153_u64 * mp + 2_u64) / 5_u64 + 1_u64;
        let month = if mp < 10_u64 { mp + 3_u64 } else { mp - 9_u64 };
        year = year + if month <= 2_u64 { 1_u64 } else { 0_u64 };

        CalendarDate {
            year: year.try_into().unwrap(),
            month: month.try_into().unwrap(),
            day: day.try_into().unwrap(),
        }
    }

    fn infer_full_expiry_year(expiry_two_digit_year: u32, current_year: u32) -> u32 {
        let current_century = (current_year / 100_u32) * 100_u32;
        let candidate = current_century + expiry_two_digit_year;

        if candidate > current_year + 20_u32 {
            candidate - 100_u32
        } else if candidate + 80_u32 < current_year {
            candidate + 100_u32
        } else {
            candidate
        }
    }

    fn expiry_to_calendar_date(expiry_date: u32, current_year: u32) -> CalendarDate {
        assert(expiry_date != 0_u32, 'Expiry missing');

        let expiry_two_digit_year = expiry_date / 10000_u32;
        let month = (expiry_date / 100_u32) % 100_u32;
        let day = expiry_date % 100_u32;
        let full_year = infer_full_expiry_year(expiry_two_digit_year, current_year);

        assert(month >= 1_u32 && month <= 12_u32, 'Invalid month');
        assert(day >= 1_u32 && day <= days_in_month(full_year, month), 'Invalid day');

        CalendarDate { year: full_year, month, day }
    }

    fn is_date_before(left: CalendarDate, right: CalendarDate) -> bool {
        if left.year != right.year {
            left.year < right.year
        } else if left.month != right.month {
            left.month < right.month
        } else {
            left.day < right.day
        }
    }

    fn is_document_expired(expiry_date: u32, timestamp: u64) -> bool {
        let current_date = timestamp_to_calendar_date(timestamp);
        let expiry = expiry_to_calendar_date(expiry_date, current_date.year);
        is_date_before(expiry, current_date)
    }

    fn clear_user_credential(ref self: ContractState, user: ContractAddress) -> u256 {
        let active_nullifier = self.user_active_nullifiers.read(user);
        self.verified_addresses.write(user, false);
        self.user_expiry_dates.write(user, 0_u32);
        self.user_active_nullifiers.write(user, 0);
        active_nullifier
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
            assert_not_paused(@self);
            self.accesscontrol.assert_only_role(ISSUER_MANAGER_ROLE);

            let current_timestamp = get_block_timestamp();
            if self.verified_addresses.read(user) {
                let existing_expiry = self.user_expiry_dates.read(user);
                assert(
                    is_document_expired(existing_expiry, current_timestamp), 'User already verified',
                );
            }

            let verifier_addr = self.verifier_address.read();
            let dispatcher = IUltraKeccakZKHonkVerifierDispatcher {
                contract_address: verifier_addr,
            };

            let result_opt = dispatcher.verify_ultra_keccak_zk_honk_proof(proof);
            assert(result_opt.is_ok(), 'Invalid Proof');

            let public_inputs: Span<u256> = ResultTrait::unwrap(result_opt);
            assert(public_inputs.len() == 6, 'Invalid pub inputs len');

            let v_root = *public_inputs.at(0);
            let v_nullifier = *public_inputs.at(1);
            let v_name_hash = *public_inputs.at(2);
            let v_doc_num_hash = *public_inputs.at(3);
            let v_birth_year = (*public_inputs.at(4)).try_into().unwrap();
            let v_expiry_date = (*public_inputs.at(5)).try_into().unwrap();

            assert(v_root == passport_root, 'Root Mismatch');
            assert(v_nullifier == nullifier, 'Nullifier Mismatch');
            assert(v_name_hash == name_hash, 'NameHash Mismatch');
            assert(v_doc_num_hash == doc_num_hash, 'DocNumHash Mismatch');
            assert(v_birth_year == birth_year, 'BirthYear Mismatch');
            assert(v_expiry_date == expiry_date, 'Expiry Mismatch');
            assert(!is_document_expired(v_expiry_date, current_timestamp), 'Document expired');

            let existing_owner = self.nullifier_owners.read(nullifier);
            assert(existing_owner.is_zero(), 'Document already used');

            self.nullifier_owners.write(nullifier, user);
            self.verified_addresses.write(user, true);
            self.user_expiry_dates.write(user, expiry_date);
            self.user_active_nullifiers.write(user, nullifier);

            self.emit(CredentialVerified { user, nullifier, timestamp: current_timestamp });
        }

        fn revoke_credential(ref self: ContractState, user: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);

            let has_credential = self.verified_addresses.read(user)
                || self.user_expiry_dates.read(user) != 0_u32
                || !self.user_active_nullifiers.read(user).is_zero();
            assert(has_credential, 'No credential');

            let admin = get_caller_address();
            let timestamp = get_block_timestamp();
            let active_nullifier = clear_user_credential(ref self, user);

            self.emit(CredentialRevoked { user, nullifier: active_nullifier, admin, timestamp });
        }

        fn update_verifier(ref self: ContractState, new_verifier: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            assert(!new_verifier.is_zero(), 'Zero verifier');

            let old_verifier = self.verifier_address.read();
            assert(old_verifier != new_verifier, 'Same verifier');

            self.verifier_address.write(new_verifier);

            self.emit(
                VerifierUpdated {
                    old_verifier,
                    new_verifier,
                    admin: get_caller_address(),
                    timestamp: get_block_timestamp(),
                },
            );
        }

        fn get_verifier(self: @ContractState) -> ContractAddress {
            self.verifier_address.read()
        }

        fn pause(ref self: ContractState) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            assert(!self.paused.read(), 'Paused');
            self.paused.write(true);
            self.emit(RegistryPaused { admin: get_caller_address(), timestamp: get_block_timestamp() });
        }

        fn unpause(ref self: ContractState) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            assert(self.paused.read(), 'Not paused');
            self.paused.write(false);
            self.emit(
                RegistryUnpaused { admin: get_caller_address(), timestamp: get_block_timestamp() },
            );
        }

        fn is_paused(self: @ContractState) -> bool {
            self.paused.read()
        }

        fn grant_issuer_manager(ref self: ContractState, account: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            assert(!account.is_zero(), 'Zero account');

            if !self.accesscontrol.has_role(ISSUER_MANAGER_ROLE, account) {
                self.accesscontrol._grant_role(ISSUER_MANAGER_ROLE, account);
                self.emit(
                    IssuerManagerGranted {
                        account,
                        admin: get_caller_address(),
                        timestamp: get_block_timestamp(),
                    },
                );
            }
        }

        fn revoke_issuer_manager(ref self: ContractState, account: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            assert(self.accesscontrol.has_role(ISSUER_MANAGER_ROLE, account), 'Not issuer');

            self.accesscontrol._revoke_role(ISSUER_MANAGER_ROLE, account);
            self.emit(
                IssuerManagerRevoked {
                    account,
                    admin: get_caller_address(),
                    timestamp: get_block_timestamp(),
                },
            );
        }

        fn grant_admin(ref self: ContractState, account: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            assert(!account.is_zero(), 'Zero account');

            if !self.accesscontrol.has_role(DEFAULT_ADMIN_ROLE, account) {
                self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, account);
                self.admin_count.write(self.admin_count.read() + 1_u32);
                self.emit(
                    AdminGranted {
                        account,
                        admin: get_caller_address(),
                        timestamp: get_block_timestamp(),
                    },
                );
            }
        }

        fn revoke_admin(ref self: ContractState, account: ContractAddress) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            assert(self.accesscontrol.has_role(DEFAULT_ADMIN_ROLE, account), 'Not admin');

            let admin_count = self.admin_count.read();
            assert(admin_count > 1_u32, 'Last admin');

            self.accesscontrol._revoke_role(DEFAULT_ADMIN_ROLE, account);
            self.admin_count.write(admin_count - 1_u32);

            self.emit(
                AdminRevoked {
                    account,
                    admin: get_caller_address(),
                    timestamp: get_block_timestamp(),
                },
            );
        }

        fn is_address_verified(self: @ContractState, user: ContractAddress) -> bool {
            let is_verified = self.verified_addresses.read(user);
            let expiry_date = self.user_expiry_dates.read(user);

            is_verified && expiry_date != 0_u32
                && !is_document_expired(expiry_date, get_block_timestamp())
        }

        fn get_nullifier_owner(self: @ContractState, nullifier: u256) -> ContractAddress {
            self.nullifier_owners.read(nullifier)
        }
    }
}
