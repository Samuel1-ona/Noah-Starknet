use starknet::ContractAddress;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address};
use super::{ICredentialRegistryDispatcher, ICredentialRegistryDispatcherTrait};

fn deploy_contract() -> (ICredentialRegistryDispatcher, ContractAddress, ContractAddress) {
    let verifier_address: ContractAddress = 0x123.try_into().unwrap();
    let owner: ContractAddress = 0x456.try_into().unwrap();
    
    let contract = declare("CredentialRegistry").unwrap().contract_class();
    let mut calldata = array![];
    calldata.append(verifier_address.into());
    calldata.append(owner.into());
    
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    
    (ICredentialRegistryDispatcher { contract_address }, owner, verifier_address)
}

#[test]
fn test_deployment() {
    let (registry, owner, _) = deploy_contract();
    
    assert(registry.get_owner() == owner, 'Wrong owner');
    assert(!registry.is_paused(), 'Should not be paused');
}

#[test]
fn test_add_jurisdiction_root() {
    let (registry, owner, _) = deploy_contract();
    
    // Set caller as owner
    start_cheat_caller_address(registry.contract_address, owner);
    
    let root: u256 = 12345;
    registry.add_jurisdiction_root(root);
    
    assert(registry.is_jurisdiction_root_valid(root), 'Root should be valid');
    
    stop_cheat_caller_address(registry.contract_address);
}

#[test]
fn test_add_membership_root() {
    let (registry, owner, _) = deploy_contract();
    
    start_cheat_caller_address(registry.contract_address, owner);
    
    let root: u256 = 67890;
    registry.add_membership_root(root);
    
    assert(registry.is_membership_root_valid(root), 'Root should be valid');
    
    stop_cheat_caller_address(registry.contract_address);
}

#[test]
fn test_batch_add_roots() {
    let (registry, owner, _) = deploy_contract();
    
    start_cheat_caller_address(registry.contract_address, owner);
    
    let roots = array![1_u256, 2_u256, 3_u256].span();
    registry.add_jurisdiction_roots_batch(roots);
    
    assert(registry.is_jurisdiction_root_valid(1), 'Root 1 invalid');
    assert(registry.is_jurisdiction_root_valid(2), 'Root 2 invalid');
    assert(registry.is_jurisdiction_root_valid(3), 'Root 3 invalid');
    
    stop_cheat_caller_address(registry.contract_address);
}

#[test]
fn test_remove_jurisdiction_root() {
    let (registry, owner, _) = deploy_contract();
    
    start_cheat_caller_address(registry.contract_address, owner);
    
    let root: u256 = 12345;
    registry.add_jurisdiction_root(root);
    assert(registry.is_jurisdiction_root_valid(root), 'Root should be valid');
    
    registry.remove_jurisdiction_root(root);
    assert(!registry.is_jurisdiction_root_valid(root), 'Root should be invalid');
    
    stop_cheat_caller_address(registry.contract_address);
}

#[test]
fn test_pause_unpause() {
    let (registry, owner, _) = deploy_contract();
    
    start_cheat_caller_address(registry.contract_address, owner);
    
    assert(!registry.is_paused(), 'Should not be paused');
    
    registry.pause();
    assert(registry.is_paused(), 'Should be paused');
    
    registry.unpause();
    assert(!registry.is_paused(), 'Should not be paused');
    
    stop_cheat_caller_address(registry.contract_address);
}

#[test]
fn test_transfer_ownership() {
    let (registry, owner, _) = deploy_contract();
    let new_owner: ContractAddress = 0x789.try_into().unwrap();
    
    start_cheat_caller_address(registry.contract_address, owner);
    
    registry.transfer_ownership(new_owner);
    assert(registry.get_owner() == new_owner, 'Ownership not transferred');
    
    stop_cheat_caller_address(registry.contract_address);
}

#[test]
#[should_panic(expected: 'Caller is not owner')]
fn test_add_root_not_owner() {
    let (registry, _, _) = deploy_contract();
    let not_owner: ContractAddress = 0x999.try_into().unwrap();
    
    start_cheat_caller_address(registry.contract_address, not_owner);
    
    // This should panic - not owner
    registry.add_jurisdiction_root(12345);
}

#[test]
#[should_panic(expected: 'Caller is not owner')]
fn test_pause_not_owner() {
    let (registry, _, _) = deploy_contract();
    let not_owner: ContractAddress = 0x999.try_into().unwrap();
    
    start_cheat_caller_address(registry.contract_address, not_owner);
    
    // This should panic - not owner
    registry.pause();
}
