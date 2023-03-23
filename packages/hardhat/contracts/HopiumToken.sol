// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 < 0.9.0;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract HopiumToken is ERC20 {

    constructor(address owner, uint256 totalSupply) ERC20("Hopium Token", "HPM") {

        _mint(owner, totalSupply);
    }
}