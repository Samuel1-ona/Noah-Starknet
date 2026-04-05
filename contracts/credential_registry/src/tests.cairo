#[starknet::interface]
pub trait IMockVerifier<TContractState> {
    fn verify_ultra_keccak_zk_honk_proof(
        self: @TContractState, proof: Span<felt252>,
    ) -> Result<Span<u256>, felt252>;
}

#[starknet::contract]
pub mod MockVerifier {
    #[storage]
    struct Storage {}

    #[abi(embed_v0)]
    impl MockVerifierImpl of super::IMockVerifier<ContractState> {
        fn verify_ultra_keccak_zk_honk_proof(
            self: @ContractState, proof: Span<felt252>,
        ) -> Result<Span<u256>, felt252> {
            let mut inputs = array![];
            assert(proof.len() == 6, 'invalid mock proof');

            inputs.append((*proof.at(0)).try_into().unwrap());
            inputs.append((*proof.at(1)).try_into().unwrap());
            inputs.append((*proof.at(2)).try_into().unwrap());
            inputs.append((*proof.at(3)).try_into().unwrap());
            inputs.append((*proof.at(4)).try_into().unwrap());
            inputs.append((*proof.at(5)).try_into().unwrap());

            Result::Ok(inputs.span())
        }
    }
}

#[cfg(test)]
mod test_suite {
    use crate::credential_registry::{
        ICredentialRegistryDispatcher, ICredentialRegistryDispatcherTrait,
    };
    use crate::protocol_access_control::{
        IProtocolAccessControlDispatcher, IProtocolAccessControlDispatcherTrait,
    };
    use snforge_std::{
        ContractClassTrait, DeclareResultTrait, declare, start_cheat_block_timestamp,
        start_cheat_caller_address, stop_cheat_block_timestamp, stop_cheat_caller_address,
    };
    use starknet::ContractAddress;

    const TS_2025_12_05: u64 = 1764892800;
    const TS_2025_12_06: u64 = 1764979200;
    const TS_2031_01_01: u64 = 1924992000;

    fn sample_proof(
        passport_root: felt252,
        nullifier: felt252,
        name_hash: felt252,
        doc_num_hash: felt252,
        birth_year: felt252,
        expiry_date: felt252,
    ) -> Array<felt252> {
        let mut proof = array![];
        proof.append(passport_root);
        proof.append(nullifier);
        proof.append(name_hash);
        proof.append(doc_num_hash);
        proof.append(birth_year);
        proof.append(expiry_date);
        proof
    }

    fn deploy_contracts() -> (
        ICredentialRegistryDispatcher,
        IProtocolAccessControlDispatcher,
        ContractAddress,
        ContractAddress,
        ContractAddress,
    ) {
        let admin: ContractAddress = 0x456.try_into().unwrap();
        let user: ContractAddress = 0x789.try_into().unwrap();

        let verifier_class = declare("MockVerifier").unwrap().contract_class();
        let (verifier_addr, _) = verifier_class.deploy(@array![]).unwrap();

        let registry_class = declare("CredentialRegistry").unwrap().contract_class();
        let mut reg_calldata = array![];
        reg_calldata.append(verifier_addr.into());
        reg_calldata.append(admin.into());
        let (registry_addr, _) = registry_class.deploy(@reg_calldata).unwrap();

        let pac_class = declare("ProtocolAccessControl").unwrap().contract_class();
        let mut pac_calldata = array![];
        pac_calldata.append(registry_addr.into());
        let (pac_addr, _) = pac_class.deploy(@pac_calldata).unwrap();

        (
            ICredentialRegistryDispatcher { contract_address: registry_addr },
            IProtocolAccessControlDispatcher { contract_address: pac_addr },
            admin,
            user,
            verifier_addr,
        )
    }

    fn deploy_mock_verifier() -> ContractAddress {
        let verifier_class = declare("MockVerifier").unwrap().contract_class();
        let (verifier_addr, _) = verifier_class.deploy(@array![]).unwrap();
        verifier_addr
    }

    #[test]
    fn test_verify_credential_success() {
        let (registry, _, admin, user, _) = deploy_contracts();

        start_cheat_caller_address(registry.contract_address, admin);
        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_05);

        let proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(user, proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 301231);

        assert(registry.is_address_verified(user), 'User should be verified');
        assert(registry.get_nullifier_owner(12345) == user, 'Nullifier should be bound');

        stop_cheat_block_timestamp(registry.contract_address);
        stop_cheat_caller_address(registry.contract_address);
    }

    #[test]
    fn test_update_verifier_success() {
        let (registry, _, admin, _, initial_verifier) = deploy_contracts();
        let new_verifier = deploy_mock_verifier();

        assert(registry.get_verifier() == initial_verifier, 'Init verifier');

        start_cheat_caller_address(registry.contract_address, admin);
        registry.update_verifier(new_verifier);

        assert(registry.get_verifier() == new_verifier, 'Verifier set');

        stop_cheat_caller_address(registry.contract_address);
    }

    #[test]
    fn test_pause_and_unpause() {
        let (registry, _, admin, _, _) = deploy_contracts();

        start_cheat_caller_address(registry.contract_address, admin);
        registry.pause();
        assert(registry.is_paused(), 'Paused');

        registry.unpause();
        assert(!registry.is_paused(), 'Unpaused');

        stop_cheat_caller_address(registry.contract_address);
    }

    #[test]
    #[should_panic]
    fn test_verify_credential_unauthorized() {
        let (registry, _, _, user, _) = deploy_contracts();

        let unauthorized: ContractAddress = 0x999.try_into().unwrap();
        start_cheat_caller_address(registry.contract_address, unauthorized);

        let proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(user, proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 301231);
    }

    #[test]
    #[should_panic(expected: 'Paused')]
    fn test_pause_blocks_verification() {
        let (registry, _, admin, user, _) = deploy_contracts();

        start_cheat_caller_address(registry.contract_address, admin);
        registry.pause();

        let proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(user, proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 301231);
    }

    #[test]
    #[should_panic(expected: 'User already verified')]
    fn test_double_verification_fails() {
        let (registry, _, admin, user, _) = deploy_contracts();

        start_cheat_caller_address(registry.contract_address, admin);
        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_05);

        let first_proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(
            user, first_proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 301231,
        );

        let second_proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(
            user, second_proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 301231,
        );
    }

    #[test]
    #[should_panic(expected: 'Document already used')]
    fn test_sybil_document_reuse_fails() {
        let (registry, _, admin, user, _) = deploy_contracts();
        let sybil_user: ContractAddress = 0xabcdef.try_into().unwrap();

        start_cheat_caller_address(registry.contract_address, admin);
        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_05);

        let first_proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(
            user, first_proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 301231,
        );

        let reused_proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(
            sybil_user, reused_proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 301231,
        );
    }

    #[test]
    fn test_revoke_credential_success() {
        let (registry, _, admin, user, _) = deploy_contracts();

        start_cheat_caller_address(registry.contract_address, admin);
        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_05);

        let proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(user, proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.revoke_credential(user);

        assert(!registry.is_address_verified(user), 'Revoked');
        assert(registry.get_nullifier_owner(12345) == user, 'Nullifier kept');

        stop_cheat_block_timestamp(registry.contract_address);
        stop_cheat_caller_address(registry.contract_address);
    }

    #[test]
    fn test_grant_issuer_manager_allows_verification() {
        let (registry, _, admin, _, _) = deploy_contracts();
        let issuer: ContractAddress = 0x9001.try_into().unwrap();
        let user: ContractAddress = 0x9002.try_into().unwrap();

        start_cheat_caller_address(registry.contract_address, admin);
        registry.grant_issuer_manager(issuer);
        stop_cheat_caller_address(registry.contract_address);

        start_cheat_caller_address(registry.contract_address, issuer);
        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_05);

        let proof = sample_proof(100, 55555, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(user, proof.span(), 100, 55555, 0xabc, 0xdef, 1990, 301231);

        assert(registry.is_address_verified(user), 'Issuer works');

        stop_cheat_block_timestamp(registry.contract_address);
        stop_cheat_caller_address(registry.contract_address);
    }

    #[test]
    #[should_panic]
    fn test_revoked_issuer_cannot_verify() {
        let (registry, _, admin, user, _) = deploy_contracts();
        let issuer: ContractAddress = 0x9001.try_into().unwrap();

        start_cheat_caller_address(registry.contract_address, admin);
        registry.grant_issuer_manager(issuer);
        registry.revoke_issuer_manager(issuer);
        stop_cheat_caller_address(registry.contract_address);

        start_cheat_caller_address(registry.contract_address, issuer);
        let proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(user, proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 301231);
    }

    #[test]
    fn test_grant_admin_allows_pause() {
        let (registry, _, admin, _, _) = deploy_contracts();
        let second_admin: ContractAddress = 0x9101.try_into().unwrap();

        start_cheat_caller_address(registry.contract_address, admin);
        registry.grant_admin(second_admin);
        stop_cheat_caller_address(registry.contract_address);

        start_cheat_caller_address(registry.contract_address, second_admin);
        registry.pause();
        assert(registry.is_paused(), 'Pause works');
        registry.unpause();

        stop_cheat_caller_address(registry.contract_address);
    }

    #[test]
    #[should_panic(expected: 'Last admin')]
    fn test_cannot_revoke_last_admin() {
        let (registry, _, admin, _, _) = deploy_contracts();

        start_cheat_caller_address(registry.contract_address, admin);
        registry.revoke_admin(admin);
    }

    #[test]
    #[should_panic]
    fn test_revoked_admin_cannot_pause() {
        let (registry, _, admin, _, _) = deploy_contracts();
        let second_admin: ContractAddress = 0x9101.try_into().unwrap();

        start_cheat_caller_address(registry.contract_address, admin);
        registry.grant_admin(second_admin);
        registry.revoke_admin(second_admin);
        stop_cheat_caller_address(registry.contract_address);

        start_cheat_caller_address(registry.contract_address, second_admin);
        registry.pause();
    }

    #[test]
    #[should_panic(expected: 'Document expired')]
    fn test_expired_document_fails() {
        let (registry, _, admin, user, _) = deploy_contracts();

        start_cheat_caller_address(registry.contract_address, admin);
        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_05);

        let proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 251204);
        registry.verify_credential(user, proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 251204);
    }

    #[test]
    fn test_verification_expires_on_chain() {
        let (registry, _, admin, user, _) = deploy_contracts();

        start_cheat_caller_address(registry.contract_address, admin);
        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_05);

        let proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 251205);
        registry.verify_credential(user, proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 251205);
        assert(registry.is_address_verified(user), 'Valid on expiry day');

        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_06);
        assert(!registry.is_address_verified(user), 'Expired user');

        stop_cheat_block_timestamp(registry.contract_address);
        stop_cheat_caller_address(registry.contract_address);
    }

    #[test]
    fn test_reverification_after_expiry_succeeds() {
        let (registry, _, admin, user, _) = deploy_contracts();

        start_cheat_caller_address(registry.contract_address, admin);
        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_05);

        let first_proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 251205);
        registry.verify_credential(
            user, first_proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 251205,
        );

        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_06);
        let renewed_proof = sample_proof(100, 67890, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(
            user, renewed_proof.span(), 100, 67890, 0xabc, 0xdef, 1990, 301231,
        );

        assert(registry.is_address_verified(user), 'Renewal failed');
        assert(registry.get_nullifier_owner(67890) == user, 'New document should be bound');

        stop_cheat_block_timestamp(registry.contract_address);
        stop_cheat_caller_address(registry.contract_address);
    }

    #[test]
    fn test_protocol_access_control() {
        let (registry, pac, admin, user, _) = deploy_contracts();
        let protocol_address: ContractAddress = 0x1111.try_into().unwrap();

        start_cheat_caller_address(registry.contract_address, admin);
        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_05);
        let proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(user, proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 301231);
        stop_cheat_caller_address(registry.contract_address);

        start_cheat_caller_address(pac.contract_address, protocol_address);
        pac.grant_access(user);
        assert(pac.check_access(protocol_address, user), 'User should have access');

        pac.revoke_access(user);
        assert(!pac.check_access(protocol_address, user), 'Access should be revoked');

        stop_cheat_caller_address(pac.contract_address);
        stop_cheat_block_timestamp(registry.contract_address);
    }

    #[test]
    fn test_pause_disables_existing_access() {
        let (registry, pac, admin, user, _) = deploy_contracts();
        let protocol_address: ContractAddress = 0x1111.try_into().unwrap();

        start_cheat_caller_address(registry.contract_address, admin);
        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_05);
        let proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(user, proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 301231);
        stop_cheat_caller_address(registry.contract_address);

        start_cheat_caller_address(pac.contract_address, protocol_address);
        pac.grant_access(user);
        assert(pac.check_access(protocol_address, user), 'Access active');
        stop_cheat_caller_address(pac.contract_address);

        start_cheat_caller_address(registry.contract_address, admin);
        registry.pause();
        stop_cheat_caller_address(registry.contract_address);

        assert(!pac.check_access(protocol_address, user), 'Paused access');

        stop_cheat_block_timestamp(registry.contract_address);
    }

    #[test]
    #[should_panic(expected: 'Registry paused')]
    fn test_pause_blocks_new_access_grants() {
        let (registry, pac, admin, user, _) = deploy_contracts();
        let protocol_address: ContractAddress = 0x1111.try_into().unwrap();

        start_cheat_caller_address(registry.contract_address, admin);
        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_05);
        let proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.verify_credential(user, proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 301231);
        registry.pause();
        stop_cheat_caller_address(registry.contract_address);

        start_cheat_caller_address(pac.contract_address, protocol_address);
        pac.grant_access(user);
    }

    #[test]
    fn test_protocol_access_expires_with_credential() {
        let (registry, pac, admin, user, _) = deploy_contracts();
        let protocol_address: ContractAddress = 0x1111.try_into().unwrap();

        start_cheat_caller_address(registry.contract_address, admin);
        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_05);
        let proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 251205);
        registry.verify_credential(user, proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 251205);
        stop_cheat_caller_address(registry.contract_address);

        start_cheat_caller_address(pac.contract_address, protocol_address);
        pac.grant_access(user);
        assert(pac.check_access(protocol_address, user), 'Access should be active');

        start_cheat_block_timestamp(registry.contract_address, TS_2031_01_01);
        assert(!pac.check_access(protocol_address, user), 'Access should expire');

        stop_cheat_caller_address(pac.contract_address);
        stop_cheat_block_timestamp(registry.contract_address);
    }

    #[test]
    #[should_panic(expected: 'User failed global KYC')]
    fn test_protocol_access_rejects_expired_user() {
        let (registry, pac, admin, user, _) = deploy_contracts();
        let protocol_address: ContractAddress = 0x1111.try_into().unwrap();

        start_cheat_caller_address(registry.contract_address, admin);
        start_cheat_block_timestamp(registry.contract_address, TS_2025_12_05);
        let proof = sample_proof(100, 12345, 0xabc, 0xdef, 1990, 251205);
        registry.verify_credential(user, proof.span(), 100, 12345, 0xabc, 0xdef, 1990, 251205);
        stop_cheat_caller_address(registry.contract_address);

        start_cheat_block_timestamp(registry.contract_address, TS_2031_01_01);
        start_cheat_caller_address(pac.contract_address, protocol_address);
        pac.grant_access(user);
    }
}
