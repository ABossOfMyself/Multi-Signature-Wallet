// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 < 0.9.0;


import "./MultiSigWallet.sol";


error MultiSigWalletCreator__User_wallet_is_not_authorized();
error MultiSigWalletCreator__MultiSigWallet_already_exist();


/**
*@title Multi Signature Wallet Creator.
*@author ABossOfMyself
*@notice This contract creates a Multi Signature Wallet.
*/


contract MultiSigWalletCreator {

    /* ========== STATE VARIABLES ========== */

    MultiSigWallet[] private multiSigWallets;


    /* ========== EVENTS ========== */

    event Deposit(address indexed user, uint256 indexed amount, uint256 indexed contractBalance);

    event MultiSigWalletCreated(uint256 multiSigWalletId, address indexed multiSigWalletAddress, address multiSigWalletCreator, address[] indexed owners, uint256 indexed signaturesRequired);

    event Owners(address indexed contractAddress, address[] owners, uint256 indexed signaturesRequired);


    /* ========== MAPPINGS ========== */

    mapping(address => bool) private isMultiSigWalletExist;


    /* ========== MODIFIERS ========== */

    modifier onlyRegisteredWallet() {

        if(isMultiSigWalletExist[msg.sender] == false) revert MultiSigWalletCreator__User_wallet_is_not_authorized();

        _;
    }


    /* ========== MUTATIVE FUNCTIONS ========== */

    receive() external payable {

        emit Deposit(msg.sender, msg.value, address(this).balance);
    }



    fallback() external payable {

        emit Deposit(msg.sender, msg.value, address(this).balance);
    }



    function createMultiSigWallet(uint256 chainId, address[] memory owners, uint256 signaturesRequired) public payable {

        MultiSigWallet newMultiSigWallet = new MultiSigWallet{value: msg.value}(chainId, owners, signaturesRequired, payable(address(this)));

        address newMultiSigWalletAddress = address(newMultiSigWallet);

        if(isMultiSigWalletExist[newMultiSigWalletAddress] == true) revert MultiSigWalletCreator__MultiSigWallet_already_exist();

        isMultiSigWalletExist[newMultiSigWalletAddress] = true;

        uint256 multiSigWalletId = multiSigWallets.length;

        multiSigWallets.push(newMultiSigWallet);

        emit MultiSigWalletCreated(multiSigWalletId, newMultiSigWalletAddress, msg.sender, owners, signaturesRequired);

        emit Owners(newMultiSigWalletAddress, owners, signaturesRequired);
    }



    function emitOwners(address contractAddress, address[] memory owners, uint256 signaturesRequired) public onlyRegisteredWallet {

        emit Owners(contractAddress, owners, signaturesRequired);
    }


    /* ========== VIEW / PURE FUNCTIONS ========== */

    function numberOfMultiSigWalletCreated() public view returns(uint256) {

        return multiSigWallets.length;
    }



    function getMultiSigWallet(uint256 multiSigWalletIndex) public view returns(address multiSigWalletAddress, uint256 signaturesRequired, uint256 multiSigWalletBalance) {

        MultiSigWallet multiSigWallet = multiSigWallets[multiSigWalletIndex];

        return (multiSigWalletAddress = address(multiSigWallet), signaturesRequired = multiSigWallet.getSignaturesRequired(), multiSigWalletBalance = address(multiSigWallet).balance);
    }



    function isMultiSigWalletAddress(address multiSigWalletAddress) public view returns(bool) {

        return isMultiSigWalletExist[multiSigWalletAddress];
    }
}