// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 < 0.9.0;


error BasicMultiSigWallet__Not_owner();
error BasicMultiSigWallet__Transaction_does_not_exist();
error BasicMultiSigWallet__Owner_already_has_approved_the_transaction();
error BasicMultiSigWallet__Required_signatures_not_met();
error BasicMultiSigWallet__Transaction_is_not_approved();
error BasicMultiSigWallet__Transaction_is_already_been_executed();
error BasicMultiSigWallet__Signatures_must_be_greater_than_zero();
error BasicMultiSigWallet__Signatures_must_be_less_than_OR_equal_to_owners();
error BasicMultiSigWallet__Owner_must_not_be_address_zero();
error BasicMultiSigWallet__Owner_already_exist();
error BasicMultiSigWallet__Owner_does_not_exist();
error BasicMultiSigWallet__Cannot_remove_the_only_owner();
error BasicMultiSigWallet__Transfer_failed();
error BasicMultiSigWallet__Transaction_address_must_be_a_new_owner_address();
error BasicMultiSigWallet__Transaction_amount_must_be_equal_to_zero();
error BasicMultiSigWallet__Transaction_address_must_be_an_old_owner_address();
error BasicMultiSigWallet__Transaction_address_must_be_a_contract_address();


/**
*@title Basic Multi Signature Wallet.
*@author ABossOfMyself
*@notice Created an on-chain multi signature wallet.
*/


contract BasicMultiSigWallet {

    /* ========== STATE VARIABLES ========== */

    address[] private owners;

    uint256 private signaturesRequired;


    /* ========== EVENTS ========== */

    event Deposited(address indexed user, uint256 indexed amount);

    event TransactionSubmitted(uint256 indexed txId, address indexed to, uint256 indexed amount, bytes data);

    event TransactionApproved(address indexed owner, uint256 indexed txId);

    event TransactionExecuted(address indexed owner, uint256 indexed txId);

    event OwnerAdded(address indexed newOwner, uint256 indexed newSignaturesRequired);

    event OwnerRemoved(address indexed oldOwner, uint256 indexed newSignaturesRequired);

    event UpdatedSignaturesRequired(address indexed owner, uint256 newSignaturesRequired);

    event TransactionApprovalRevoked(address indexed owner, uint256 indexed txId);

    event TransactionDataDeleted(address indexed owner, uint256 indexed txId);


    /* ========== MAPPINGS ========== */

    mapping(address => bool) private isOwner;

    mapping(uint256 => mapping(address => bool)) private approval;


    /* ========== STRUCT ========== */

    struct Transaction {

        address to;

        uint256 amount;

        bytes data;

        bool executed;

        uint256 signatures;
    }


    Transaction[] private transactions;


    /* ========== MODIFIERS ========== */

    modifier onlyOwner() {

        if(isOwner[msg.sender] == false) revert BasicMultiSigWallet__Not_owner();

        _;
    }


    modifier doesTxExists(uint256 _txId) {

        if(_txId > transactions.length) revert BasicMultiSigWallet__Transaction_does_not_exist();

        _;
    }


    modifier isTxAlreadyApprovedByTheOwner(uint256 _txId) {

        if(approval[_txId][msg.sender] == true) revert BasicMultiSigWallet__Owner_already_has_approved_the_transaction();

        _;
    }


    modifier doesTxHaveEnoughSignatures(uint256 _txId) {

        Transaction storage transaction = transactions[_txId];

        if(transaction.signatures < signaturesRequired) revert BasicMultiSigWallet__Required_signatures_not_met();

        _;
    }


    modifier isTxApproved(uint256 _txId) {

        if(approval[_txId][msg.sender] == false) revert BasicMultiSigWallet__Transaction_is_not_approved();

        _;
    }


    modifier isTxExecuted(uint256 _txId) {

        Transaction storage transaction = transactions[_txId];

        if(transaction.executed == true) revert BasicMultiSigWallet__Transaction_is_already_been_executed();

        _;
    }


    /* ========== CONSTRUCTOR ========== */

    constructor(address[] memory _owners, uint256 _signaturesRequired) {

        if(_signaturesRequired <= 0) revert BasicMultiSigWallet__Signatures_must_be_greater_than_zero();

        if(_signaturesRequired > _owners.length) revert BasicMultiSigWallet__Signatures_must_be_less_than_OR_equal_to_owners();

        for(uint256 i = 0; i < _owners.length;) {

            address owner = _owners[i];

            if(owner == address(0)) revert BasicMultiSigWallet__Owner_must_not_be_address_zero();

            if(isOwner[owner] == true) revert BasicMultiSigWallet__Owner_already_exist();

            isOwner[owner] = true;

            owners.push(owner);

            unchecked {

                ++i;
            }
        }

        signaturesRequired = _signaturesRequired;
    }


    /* ========== MUTATIVE FUNCTIONS ========== */

    receive() external payable {

        emit Deposited(msg.sender, msg.value);
    }



    fallback() external payable {

        emit Deposited(msg.sender, msg.value);
    }



    function submitTransaction(address _to, uint256 _amount, bytes calldata _data) public onlyOwner returns(uint256 txId) {

        transactions.push(Transaction({to: _to, amount: _amount, data: _data, executed: false, signatures: 0}));

        txId = transactions.length - 1;

        emit TransactionSubmitted(txId, _to, _amount, _data);
    }



    function approveTransaction(uint256 _txId) public onlyOwner doesTxExists(_txId) isTxAlreadyApprovedByTheOwner(_txId) isTxExecuted(_txId) {

        approval[_txId][msg.sender] = true;

        Transaction storage transaction = transactions[_txId];

        transaction.signatures++;

        emit TransactionApproved(msg.sender, _txId);
    }



    function executeTransaction(uint256 _txId) public onlyOwner doesTxExists(_txId) doesTxHaveEnoughSignatures(_txId) isTxExecuted(_txId) {

        Transaction storage transaction = transactions[_txId];

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.amount}(transaction.data);

        if(!success) revert BasicMultiSigWallet__Transfer_failed();

        emit TransactionExecuted(msg.sender, _txId);
    }



    function executeAddOwnerTransaction(uint256 _txId, address newOwner, uint256 newSignaturesRequired) public onlyOwner doesTxExists(_txId) doesTxHaveEnoughSignatures(_txId) isTxExecuted(_txId) {

        Transaction storage transaction = transactions[_txId];

        if(transaction.to != newOwner) revert BasicMultiSigWallet__Transaction_address_must_be_a_new_owner_address();

        if(transaction.amount != 0) revert BasicMultiSigWallet__Transaction_amount_must_be_equal_to_zero();

        executeTransaction(_txId);

        _addOwner(newOwner, newSignaturesRequired);

        emit OwnerAdded(newOwner, newSignaturesRequired);
    }



    function executeRemoveOwnerTransaction(uint256 _txId, address oldOwner, uint256 newSignaturesRequired) public onlyOwner doesTxExists(_txId) doesTxHaveEnoughSignatures(_txId) isTxExecuted(_txId) {

        Transaction storage transaction = transactions[_txId];

        if(transaction.to != oldOwner) revert BasicMultiSigWallet__Transaction_address_must_be_an_old_owner_address();

        if(transaction.amount != 0) revert BasicMultiSigWallet__Transaction_amount_must_be_equal_to_zero();

        executeTransaction(_txId);

        _removeOwner(oldOwner, newSignaturesRequired);

        emit OwnerRemoved(oldOwner, newSignaturesRequired);
    }



    function executeUpdateSignaturesRequiredTransaction(uint256 _txId, uint256 newSignaturesRequired) public onlyOwner doesTxExists(_txId) doesTxHaveEnoughSignatures(_txId) isTxExecuted(_txId) {
        
        Transaction storage transaction = transactions[_txId];

        if(transaction.to != address(this)) revert BasicMultiSigWallet__Transaction_address_must_be_a_contract_address();

        if(transaction.amount != 0) revert BasicMultiSigWallet__Transaction_amount_must_be_equal_to_zero();

        executeTransaction(_txId);

        _updateSignaturesRequired(newSignaturesRequired);

        emit UpdatedSignaturesRequired(msg.sender, newSignaturesRequired);
    }



    function revokeTransactionApproval(uint256 _txId) public onlyOwner doesTxExists(_txId) isTxApproved(_txId) isTxExecuted(_txId) {

        approval[_txId][msg.sender] = false;

        Transaction storage transaction = transactions[_txId];

        transaction.signatures--;

        emit TransactionApprovalRevoked(msg.sender, _txId);
    }



    function deleteTransactionData(uint256 _txId) public onlyOwner doesTxExists(_txId) isTxExecuted(_txId) {

        delete transactions[_txId];

        emit TransactionDataDeleted(msg.sender, _txId);
    }


    /* ========== INTERNAL FUNCTIONS ========== */

    function _addOwner(address newOwner, uint256 newSignaturesRequired) internal {

        if(isOwner[newOwner] == true) revert BasicMultiSigWallet__Owner_already_exist();

        if(newOwner == address(0)) revert BasicMultiSigWallet__Owner_must_not_be_address_zero();

        if(newSignaturesRequired <= 0) revert BasicMultiSigWallet__Signatures_must_be_greater_than_zero();

        if(newSignaturesRequired > owners.length + 1) revert BasicMultiSigWallet__Signatures_must_be_less_than_OR_equal_to_owners();

        isOwner[newOwner] = true;

        owners.push(newOwner);

        signaturesRequired = newSignaturesRequired;
    }



    function _removeOwner(address oldOwner, uint256 newSignaturesRequired) internal {

        if(isOwner[oldOwner] == false) revert BasicMultiSigWallet__Owner_does_not_exist();

        if(newSignaturesRequired <= 0) revert BasicMultiSigWallet__Signatures_must_be_greater_than_zero();

        if(newSignaturesRequired > owners.length - 1) revert BasicMultiSigWallet__Signatures_must_be_less_than_OR_equal_to_owners();

        if(owners.length <= 1) revert BasicMultiSigWallet__Cannot_remove_the_only_owner();

        isOwner[oldOwner] = false;

        address lastAddressInOwnersArray = owners[owners.length - 1];

        if(lastAddressInOwnersArray == oldOwner) {

            owners.pop();

        } else {

            for(uint256 i = owners.length - 2; i >= 0;) {

                if(owners[i] == oldOwner) {

                    address oldOwnerAddress = owners[i];

                    owners[i] = lastAddressInOwnersArray;

                    lastAddressInOwnersArray = oldOwnerAddress;

                    owners.pop();

                    break;
                }

                unchecked {

                    --i;
                }
            }
        }

        signaturesRequired = newSignaturesRequired;
    }



    function _updateSignaturesRequired(uint256 newSignaturesRequired) internal {

        if(newSignaturesRequired <= 0) revert BasicMultiSigWallet__Signatures_must_be_greater_than_zero();

        if(newSignaturesRequired > owners.length) revert BasicMultiSigWallet__Signatures_must_be_less_than_OR_equal_to_owners();

        signaturesRequired = newSignaturesRequired;
    }


    /* ========== VIEW / PURE FUNCTIONS ========== */

    function getOwners() public view returns(address[] memory) {

        return owners;
    }



    function getNumberOfOwners() public view returns(uint256) {

        return owners.length;
    }



    function getSignaturesRequired() public view returns(uint256) {

        return signaturesRequired;
    }



    function getTransaction(uint256 transactionIndex) public view returns(address to, uint256 amount, bytes memory data, bool executed, uint256 signatures) {

        Transaction storage transaction = transactions[transactionIndex];

        return (to = transaction.to, amount = transaction.amount, data = transaction.data, executed = transaction.executed, signatures = transaction.signatures);
    }    



    function isOwnerAddress(address user) public view returns(bool) {

        return isOwner[user];
    }



    function isTxApprovedByOwner(uint256 txId, address owner) public view returns(bool) {

        return approval[txId][owner];
    }
}