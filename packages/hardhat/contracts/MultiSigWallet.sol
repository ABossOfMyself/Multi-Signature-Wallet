// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 < 0.9.0;


import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./MultiSigWalletCreator.sol";


error MultiSigWallet__Not_owner();
error MultiSigWallet__Not_the_contract_it_self();
error MultiSigWallet__Signatures_must_be_greater_than_zero();
error MultiSigWallet__Signatures_must_be_less_than_OR_equal_to_owners();
error MultiSigWallet__Owner_must_not_be_address_zero();
error MultiSigWallet__Owner_already_exist();
error MultiSigWallet__Owner_does_not_exist();
error MultiSigWallet__Cannot_remove_the_only_owner();
error MultiSigWallet__Signature_is_duplicated_OR_not_unique();
error MultiSigWallet__Required_signatures_not_met();
error MultiSigWallet__Transfer_failed();


/**
*@title Multi Signature Wallet.
*@author ABossOfMyself
*@notice Created an off-chain signature-based shared wallet amongst different owners that uses meta-transaction and ECDSA recover().
*/


contract MultiSigWallet {

    /* ========== TYPES DECLARATION ========== */

    using ECDSA for bytes32;


    /* ========== STATE VARIABLES ========== */

    MultiSigWalletCreator private multiSigWalletCreator;


    address[] private owners;

    uint256 private signaturesRequired;

    uint256 private chainId;

    uint256 private nonce;


    /* ========== EVENTS ========== */

    event Deposit(address indexed user, uint256 indexed amount, uint256 indexed contractBalance);

    event ExecuteTransaction(address indexed owner, address indexed to, uint256 amount, bytes data, uint256 nonce, bytes32 hash, bytes result);

    event Owner(address indexed owner, bool status);


    /* ========== MAPPINGS ========== */

    mapping(address => bool) private isOwner;


    /* ========== MODIFIERS ========== */

    modifier onlyOwner() {

        if(isOwner[msg.sender] == false) revert MultiSigWallet__Not_owner();

        _;
    }


    modifier onlyContractItSelf() {

        if(msg.sender != address(this)) revert MultiSigWallet__Not_the_contract_it_self();

        _;
    }


    /* ========== CONSTRUCTOR ========== */

    constructor(uint256 _chainId, address[] memory _owners, uint256 _signaturesRequired, address payable _multiSigWalletCreator) payable {

        if(_signaturesRequired <= 0) revert MultiSigWallet__Signatures_must_be_greater_than_zero();

        if(_signaturesRequired > _owners.length) revert MultiSigWallet__Signatures_must_be_less_than_OR_equal_to_owners();

        for(uint256 i = 0; i < _owners.length;) {

            address owner = _owners[i];

            if(owner == address(0)) revert MultiSigWallet__Owner_must_not_be_address_zero();

            if(isOwner[owner] == true) revert MultiSigWallet__Owner_already_exist();

            isOwner[owner] = true;

            owners.push(owner);

            emit Owner(owner, isOwner[owner]);

            unchecked {

                ++i;
            }
        }

        chainId = _chainId;

        signaturesRequired = _signaturesRequired;

        multiSigWalletCreator = MultiSigWalletCreator(_multiSigWalletCreator);
    }

    
    /* ========== MUTATIVE FUNCTIONS ========== */

    receive() external payable {

        emit Deposit(msg.sender, msg.value, address(this).balance);
    }



    fallback() external payable {

        emit Deposit(msg.sender, msg.value, address(this).balance);
    }



    function addOwner(address newOwner, uint256 newSignaturesRequired) public onlyContractItSelf {

        if(isOwner[newOwner] == true) revert MultiSigWallet__Owner_already_exist();

        if(newOwner == address(0)) revert MultiSigWallet__Owner_must_not_be_address_zero();

        if(newSignaturesRequired <= 0) revert MultiSigWallet__Signatures_must_be_greater_than_zero();

        if(newSignaturesRequired > owners.length + 1) revert MultiSigWallet__Signatures_must_be_less_than_OR_equal_to_owners();

        isOwner[newOwner] = true;

        owners.push(newOwner);

        signaturesRequired = newSignaturesRequired;

        emit Owner(newOwner, isOwner[newOwner]);

        multiSigWalletCreator.emitOwners(address(this), owners, signaturesRequired);
    }



    function removeOwner(address oldOwner, uint256 newSignaturesRequired) public onlyContractItSelf {

        if(isOwner[oldOwner] == false) revert MultiSigWallet__Owner_does_not_exist();

        if(newSignaturesRequired <= 0) revert MultiSigWallet__Signatures_must_be_greater_than_zero();

        if(newSignaturesRequired > owners.length - 1) revert MultiSigWallet__Signatures_must_be_less_than_OR_equal_to_owners();

        if(owners.length <= 1) revert MultiSigWallet__Cannot_remove_the_only_owner();

        isOwner[oldOwner] = false;

        address lastAddressInOwnersArray = owners[owners.length - 1];

        // Check if the last address in the owners array is the oldOwner address. If it is we can remove it.

        if(lastAddressInOwnersArray == oldOwner) {

            owners.pop();

        } else {

            // If not then iterate through the owners array and swap the oldOwner address with the last address in the owners array. Then we can remove it.

            for(uint256 i = owners.length - 2; i >= 0;) {

                if(owners[i] == oldOwner) {

                    address oldOwnerAddress = owners[i];

                    owners[i] = lastAddressInOwnersArray;  // Swapped oldOwnerAddress to the lastAddressInOwnersArray index spot.

                    lastAddressInOwnersArray = oldOwnerAddress;  // and Swapped the owner who was on the lastAddressInOwnersArray index spot to the oldOwnerAddress index spot.

                    owners.pop();

                    break;
                }

                unchecked {

                    --i;
                }
            }
        }

        signaturesRequired = newSignaturesRequired;

        emit Owner(oldOwner, isOwner[oldOwner]);

        multiSigWalletCreator.emitOwners(address(this), owners, signaturesRequired);
    }



    function updateSignaturesRequired(uint256 newSignaturesRequired) public onlyContractItSelf {

        if(newSignaturesRequired <= 0) revert MultiSigWallet__Signatures_must_be_greater_than_zero();

        if(newSignaturesRequired > owners.length) revert MultiSigWallet__Signatures_must_be_less_than_OR_equal_to_owners();

        signaturesRequired = newSignaturesRequired;
    }



    function executeTransaction(address payable to, uint256 amount, bytes calldata data, bytes[] calldata signatures) public onlyOwner returns(bytes memory) {

        bytes32 hash = getTransactionHash(nonce, to, amount, data);

        nonce++;

        uint256 validSignatures;

        address duplicateGuard;

        for(uint256 i = 0; i < signatures.length;) {

            address recovered = recover(hash, signatures[i]);

            if(recovered <= duplicateGuard) revert MultiSigWallet__Signature_is_duplicated_OR_not_unique();

            duplicateGuard = recovered;

            if(isOwner[recovered] == true) {

                validSignatures++;
            }

            unchecked {

                ++i;
            }
        }

        if(validSignatures < signaturesRequired) revert MultiSigWallet__Required_signatures_not_met();

        (bool success, bytes memory result) = to.call{value: amount}(data);

        if(!success) revert MultiSigWallet__Transfer_failed();

        emit ExecuteTransaction(msg.sender, to, amount, data, nonce - 1, hash, result);

        return result;
    }


    /* ========== VIEW / PURE FUNCTIONS ========== */

    function getTransactionHash(uint256 _nonce, address _to, uint256 _amount, bytes calldata _data) public view returns(bytes32) {

        return(keccak256(abi.encodePacked(_nonce, address(this), _to, _amount, _data)));
    }



    function recover(bytes32 hash, bytes calldata signature) public pure returns(address) {

        return hash.toEthSignedMessageHash().recover(signature);
    }



    function getOwners() public view returns(address[] memory) {

        return owners;
    }



    function getNumberOfOwners() public view returns(uint256) {

        return owners.length;
    }



    function getSignaturesRequired() public view returns(uint256) {

        return signaturesRequired;
    }



    function getChainId() public view returns(uint256) {

        return chainId;
    }



    function getNonce() public view returns(uint256) {

        return nonce;
    }



    function isOwnerAddress(address user) public view returns(bool) {

        return isOwner[user];
    }
}