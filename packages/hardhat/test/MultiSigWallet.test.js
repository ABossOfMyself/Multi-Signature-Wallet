const { ethers } = require("hardhat")
const { expect } = require("chai")


describe("Testing Contracts", () => {

  let multiSigWalletCreator, hopiumToken, multiSigWallet, multiSigWalletAddress, multiSigWalletContract, getMultiSigWallet, owner, userOne, userTwo, chainId, signaturesRequired, amount, hopiumTokenTotalSupply


  beforeEach("Deploying Contracts...", async() => {

    const accounts = await ethers.getSigners()

    owner = accounts[0]

    userOne = accounts[1]

    userTwo = accounts[2]

    chainId = 1

    signaturesRequired = 1

    amount = ethers.utils.parseEther("1")

    hopiumTokenTotalSupply = "100"

    const multiSigWalletCreatorContractFactory = await ethers.getContractFactory("MultiSigWalletCreator")

    multiSigWalletCreator = await multiSigWalletCreatorContractFactory.deploy()

    await multiSigWalletCreator.deployed()

    await multiSigWalletCreator.createMultiSigWallet(chainId, [owner.address], signaturesRequired, { value: amount })

    getMultiSigWallet = await multiSigWalletCreator.getMultiSigWallet(0)

    multiSigWalletAddress = getMultiSigWallet.multiSigWalletAddress

    const hopiumTokenContractFactory = await ethers.getContractFactory("HopiumToken")

    hopiumToken = await hopiumTokenContractFactory.deploy(multiSigWalletAddress, hopiumTokenTotalSupply)

    await hopiumToken.deployed()

    const multiSigWalletContractFactory = await ethers.getContractFactory("MultiSigWallet")

    multiSigWalletContract = await multiSigWalletContractFactory.deploy(chainId, [owner.address], signaturesRequired, multiSigWalletCreator.address, { value: amount })

    await multiSigWalletContract.deployed()

    multiSigWallet = await multiSigWalletContract.attach(multiSigWalletAddress)
  })

  describe("Testing MultiSigWalletCreator functionality", () => {

    describe("MultiSigWalletCreator deployment", () => {

      it("getMultiSigWallet at index '0' should return the deployed multiSigWallet", async() => {

        const multiSigWallet = await multiSigWalletCreator.getMultiSigWallet(0)

        expect(multiSigWallet.multiSigWalletAddress).to.equal(multiSigWalletAddress)

        expect(multiSigWallet.signaturesRequired).to.equal(signaturesRequired)

        expect(multiSigWallet.multiSigWalletBalance).to.equal(amount)
      })

      it("isMultiSigWalletAddress should return true for the deployed multiSigWallet address", async() => {

        expect(await multiSigWalletCreator.isMultiSigWalletAddress(multiSigWalletAddress)).to.equal(true)
      })

      it("numberOfMultiSigWalletCreated should return '1'", async() => {

        expect(await multiSigWalletCreator.numberOfMultiSigWalletCreated()).to.equal(1)
      })
    })

    describe("createMultiSigWallet", () => {

      it("MultiSigWalletCreator should be able to create a multiSigWallet", async() => {

        const chainId = 2

        const signaturesRequired = 2

        const amount = ethers.utils.parseEther("2")

        await multiSigWalletCreator.createMultiSigWallet(chainId, [owner.address, userOne.address], signaturesRequired, { value: amount })

        const multiSigWallet = await multiSigWalletCreator.getMultiSigWallet(1)  // Our deployed multiSigWallet is at index '0'.

        expect(await multiSigWalletCreator.isMultiSigWalletAddress(multiSigWallet.multiSigWalletAddress)).to.equal(true)

        expect(multiSigWallet.signaturesRequired).to.equal(2)

        expect(multiSigWallet.multiSigWalletBalance).to.equal(amount)

        expect(await multiSigWalletCreator.numberOfMultiSigWalletCreated()).to.equal(2)  // Our deployed multiSigWallet + this multiSigWallet.
      })

      it("It should revert, If signatures are less than or equal to '0'", async() => {
  
        const signaturesRequired = 0
  
        await expect(multiSigWalletCreator.createMultiSigWallet(chainId, [owner.address], signaturesRequired, { value: amount })).to.be.revertedWith("MultiSigWallet__Signatures_must_be_greater_than_zero")
      })
  
      it("It should revert, If signatures are greater than owners", async() => {
  
        const signaturesRequired = 2
  
        await expect(multiSigWalletCreator.createMultiSigWallet(chainId, [owner.address], signaturesRequired, { value: amount })).to.be.revertedWith("MultiSigWallet__Signatures_must_be_less_than_OR_equal_to_owners")
      })
  
      it("It should revert, If the owner is address zero", async() => {
  
        const signaturesRequired = 1
  
        const addressZero = "0x0000000000000000000000000000000000000000"
  
        await expect(multiSigWalletCreator.createMultiSigWallet(chainId, [addressZero], signaturesRequired, { value: amount })).to.be.revertedWith("MultiSigWallet__Owner_must_not_be_address_zero")
      })
  
      it("It should revert, If there is a duplicate owner", async() => {
  
        const signaturesRequired = 2
  
        await expect(multiSigWalletCreator.createMultiSigWallet(chainId, [owner.address, owner.address], signaturesRequired, { value: amount })).to.be.revertedWith("MultiSigWallet__Owner_already_exist")
      })
    })
  })

  describe("Testing MultiSigWallet functionality", () => {

    describe("MultiSigWallet deployment", () => {

      it("getChainId should return the chainId of the deployed multiSigWallet", async() => {

        expect(await multiSigWallet.getChainId()).to.equal(chainId)
      })

      it("getOwners should return the owner address of the deployed multiSigWallet", async() => {
  
        expect((await multiSigWallet.getOwners()).toString()).to.equal(owner.address)
      })

      it("isOwnerAddress should return true for the owner address", async() => {

        expect(await multiSigWallet.isOwnerAddress(owner.address)).to.equal(true)
      })

      it("getNumberOfOwners should return '1'", async() => {
  
        expect(await multiSigWallet.getNumberOfOwners()).to.equal(1)
      })

      it("getSignaturesRequired should return the signaturesRequired of the deployed multiSigWallet", async() => {

        expect(await multiSigWallet.getSignaturesRequired()).to.equal(signaturesRequired)
      })

      it("MultiSigWallet balance should be equal to the amount of balance given at deployment", async() => {

        expect(await multiSigWallet.provider.getBalance(multiSigWallet.address)).to.equal(amount)
      })
  
      it("MultiSigWallet should own all the hopium tokens", async() => {
  
        const multiSigWalletHopiumBalance = await hopiumToken.balanceOf(multiSigWallet.address)
  
        const hopiumTokenTotalSupply = await hopiumToken.totalSupply()
        
        expect(multiSigWalletHopiumBalance).to.equal(hopiumTokenTotalSupply)
      })
    })

    describe("addOwner", () => {

      it("It should revert, If addOwner function is not being executed by the contract", async() => {

        const newSignaturesRequired = 1

        await expect(multiSigWallet.addOwner(userOne.address, newSignaturesRequired)).to.be.revertedWith("MultiSigWallet__Not_the_contract_it_self")

        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(false)
      })

      it("Adding a new owner, and updating signaturesRequired to '2'", async() => {

        const newSignaturesRequired = 2
  
        const nonce = await multiSigWallet.getNonce()
  
        const to = multiSigWallet.address
  
        const amount = 0
  
        const callData = multiSigWallet.interface.encodeFunctionData("addOwner", [userOne.address, newSignaturesRequired])
        
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)
  
        await multiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])

        expect(await multiSigWallet.getNumberOfOwners()).to.equal(2)
  
        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(true)
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(2)
      })

      it("It should revert, Adding an already existed owner", async() => {

        const newSignaturesRequired = 1
  
        const nonce = await multiSigWallet.getNonce()
  
        const to = multiSigWallet.address
  
        const amount = 0
  
        const callData = multiSigWallet.interface.encodeFunctionData("addOwner", [owner.address, newSignaturesRequired])
  
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)

        expect(await multiSigWallet.isOwnerAddress(owner.address)).to.equal(true)
  
        await expect(multiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])).to.be.revertedWith("MultiSigWallet__Transfer_failed")
  
        expect(await multiSigWallet.getNumberOfOwners()).to.equal(1)
      })

      it("It should revert, Adding an address zero as owner", async() => {

        const addressZero = "0x0000000000000000000000000000000000000000"
  
        const newSignaturesRequired = 1
  
        const nonce = await multiSigWallet.getNonce()
  
        const to = multiSigWallet.address
  
        const amount = 0
  
        const callData = multiSigWallet.interface.encodeFunctionData("addOwner", [addressZero, newSignaturesRequired])
  
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)
  
        await expect(multiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])).to.be.revertedWith("MultiSigWallet__Transfer_failed")
  
        expect(await multiSigWallet.isOwnerAddress(addressZero)).to.equal(false)
      })

      it("It should revert, Adding an owner, and updating signaturesRequired to '0'", async() => {

        const newSignaturesRequired = 0
  
        const nonce = await multiSigWallet.getNonce()
  
        const to = multiSigWallet.address
  
        const amount = 0
  
        const callData = multiSigWallet.interface.encodeFunctionData("addOwner", [userOne.address, newSignaturesRequired])
  
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)
  
        await expect(multiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])).to.be.revertedWith("MultiSigWallet__Transfer_failed")
  
        expect(await multiSigWallet.getNumberOfOwners()).to.equal(1)

        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(false)

        expect(await multiSigWallet.getSignaturesRequired()).to.equal(1)
      })

      it("It should revert, Adding an owner, and updating signaturesRequired to '3', and there is currently '1' owner + the new owner", async() => {

        const newSignaturesRequired = 3
  
        const nonce = await multiSigWallet.getNonce()
  
        const to = multiSigWallet.address
  
        const amount = 0
  
        const callData = multiSigWallet.interface.encodeFunctionData("addOwner", [userTwo.address, newSignaturesRequired])
  
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)
  
        await expect(multiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])).to.be.revertedWith("MultiSigWallet__Transfer_failed")
  
        expect(await multiSigWallet.getNumberOfOwners()).to.equal(1)

        expect(await multiSigWallet.isOwnerAddress(userTwo.address)).to.equal(false)

        expect(await multiSigWallet.getSignaturesRequired()).to.equal(1)
      })
    })

    describe("removeOwner", () => {

      it("It should revert, If removeOwner function is not being executed by the contract", async() => {

        const newSignaturesRequired = 1

        const nonce = await multiSigWallet.getNonce()
  
        const to = multiSigWallet.address
  
        const amount = 0
  
        const callData = multiSigWallet.interface.encodeFunctionData("addOwner", [userOne.address, newSignaturesRequired])
        
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)
  
        await multiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])

        expect(await multiSigWallet.getNumberOfOwners()).to.equal(2)
  
        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(true)
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(1)

        await expect(multiSigWallet.removeOwner(userOne.address, newSignaturesRequired)).to.be.revertedWith("MultiSigWallet__Not_the_contract_it_self")
        
        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(true)
      })

      it("Removing an owner, and updating signaturesRequired to '1'", async() => {

        const to = multiSigWallet.address
  
        const amount = 0
  
        const newSignaturesRequired = 2
  
        const nonce = await multiSigWallet.getNonce()
  
        const addOwnerCallData = multiSigWallet.interface.encodeFunctionData("addOwner", [userOne.address, newSignaturesRequired])
  
        const addOwnerHash = await multiSigWallet.getTransactionHash(nonce, to, amount, addOwnerCallData)
  
        const ownerAddOwnerSignature = await owner.provider.send("personal_sign", [addOwnerHash, owner.address])
  
        expect(await multiSigWallet.recover(addOwnerHash, ownerAddOwnerSignature)).to.equal(owner.address)
  
        await multiSigWallet.executeTransaction(to, amount, addOwnerCallData, [ownerAddOwnerSignature])
  
        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(true)

        expect(await multiSigWallet.getNumberOfOwners()).to.equal(2)
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(2)
  
        const updateSignaturesRequired = 1
  
        const updatedNonce = await multiSigWallet.getNonce()
  
        const removeOwnerCallData = multiSigWallet.interface.encodeFunctionData("removeOwner", [userOne.address, updateSignaturesRequired])
  
        const removeOwnerHash = await multiSigWallet.getTransactionHash(updatedNonce, to, amount, removeOwnerCallData)

        const ownerRemoveOwnerSignature = await owner.provider.send("personal_sign", [removeOwnerHash, owner.address])
  
        const userOneRemoveOwnerSignature = await userOne.provider.send("personal_sign", [removeOwnerHash, userOne.address])
  
        expect(await multiSigWallet.recover(removeOwnerHash, ownerRemoveOwnerSignature)).to.equal(owner.address)
  
        expect(await multiSigWallet.recover(removeOwnerHash, userOneRemoveOwnerSignature)).to.equal(userOne.address)
  
        await multiSigWallet.executeTransaction(to, amount, removeOwnerCallData, [userOneRemoveOwnerSignature, ownerRemoveOwnerSignature])
  
        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(false)

        expect(await multiSigWallet.getNumberOfOwners()).to.equal(1)
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(1)
      })

      it("It should revert, Removing an owner, updating signaturesRequired to '0'", async() => {

        const to = multiSigWallet.address
  
        const amount = 0
  
        const newSignaturesRequired = 2
  
        const nonce = await multiSigWallet.getNonce()
  
        const addOwnerCallData = multiSigWallet.interface.encodeFunctionData("addOwner", [userOne.address, newSignaturesRequired])
  
        const addOwnerHash = await multiSigWallet.getTransactionHash(nonce, to, amount, addOwnerCallData)
  
        const ownerAddOwnerSignature = await owner.provider.send("personal_sign", [addOwnerHash, owner.address])
  
        expect(await multiSigWallet.recover(addOwnerHash, ownerAddOwnerSignature)).to.equal(owner.address)
  
        await multiSigWallet.executeTransaction(to, amount, addOwnerCallData, [ownerAddOwnerSignature])
  
        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(true)
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(2)
  
        const updateSignaturesRequired = 0
  
        const updatedNonce = await multiSigWallet.getNonce()
  
        const removeOwnerCallData = multiSigWallet.interface.encodeFunctionData("removeOwner", [userOne.address, updateSignaturesRequired])
  
        const removeOwnerHash = await multiSigWallet.getTransactionHash(updatedNonce, to, amount, removeOwnerCallData)

        const ownerRemoveOwnerSignature = await owner.provider.send("personal_sign", [removeOwnerHash, owner.address])
  
        const userOneRemoveOwnerSignature = await userOne.provider.send("personal_sign", [removeOwnerHash, userOne.address])
  
        expect(await multiSigWallet.recover(removeOwnerHash, ownerRemoveOwnerSignature)).to.equal(owner.address)
  
        expect(await multiSigWallet.recover(removeOwnerHash, userOneRemoveOwnerSignature)).to.equal(userOne.address)
  
        await expect(multiSigWallet.executeTransaction(to, amount, removeOwnerCallData, [userOneRemoveOwnerSignature, ownerRemoveOwnerSignature])).to.be.revertedWith("MultiSigWallet__Transfer_failed")
  
        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(true)
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(2)
      })

      it("It should revert, Removing an owner, and updating signaturesRequired to '2', and there going to be '2' owners - the old owner", async() => {

        const to = multiSigWallet.address
  
        const amount = 0
  
        const newSignaturesRequired = 1
  
        const nonce = await multiSigWallet.getNonce()
  
        const addOwnerCallData = multiSigWallet.interface.encodeFunctionData("addOwner", [userOne.address, newSignaturesRequired])
  
        const addOwnerHash = await multiSigWallet.getTransactionHash(nonce, to, amount, addOwnerCallData)
  
        const ownerAddOwnerSignature = await owner.provider.send("personal_sign", [addOwnerHash, owner.address])
  
        expect(await multiSigWallet.recover(addOwnerHash, ownerAddOwnerSignature)).to.equal(owner.address)
  
        await multiSigWallet.executeTransaction(to, amount, addOwnerCallData, [ownerAddOwnerSignature])
  
        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(true)

        expect(await multiSigWallet.getNumberOfOwners()).to.equal(2)
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(1)
  
        const updateSignaturesRequired = 2
  
        const updatedNonce = await multiSigWallet.getNonce()
  
        const removeOwnerCallData = multiSigWallet.interface.encodeFunctionData("removeOwner", [userOne.address, updateSignaturesRequired])
  
        const removeOwnerHash = await multiSigWallet.getTransactionHash(updatedNonce, to, amount, removeOwnerCallData)

        const ownerRemoveOwnerSignature = await owner.provider.send("personal_sign", [removeOwnerHash, owner.address])
  
        const userOneRemoveOwnerSignature = await userOne.provider.send("personal_sign", [removeOwnerHash, userOne.address])
  
        expect(await multiSigWallet.recover(removeOwnerHash, ownerRemoveOwnerSignature)).to.equal(owner.address)
  
        expect(await multiSigWallet.recover(removeOwnerHash, userOneRemoveOwnerSignature)).to.equal(userOne.address)
  
        await expect(multiSigWallet.executeTransaction(to, amount, removeOwnerCallData, [userOneRemoveOwnerSignature, ownerRemoveOwnerSignature])).to.be.revertedWith("MultiSigWallet__Transfer_failed")
  
        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(true)

        expect(await multiSigWallet.getNumberOfOwners()).to.equal(2)
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(1)
      })

      it("It should revert, Removing non existed owner", async() => {

        const newSignaturesRequired = 1
  
        const nonce = await multiSigWallet.getNonce()
  
        const to = multiSigWallet.address
  
        const amount = 0
  
        const callData = multiSigWallet.interface.encodeFunctionData("removeOwner", [userOne.address, newSignaturesRequired])
  
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)

        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(false)
  
        await expect(multiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])).to.be.revertedWith("MultiSigWallet__Transfer_failed")
      })

      it("It should revert, Removing the only owner from the wallet", async() => {

        const newSignaturesRequired = 1
  
        const nonce = await multiSigWallet.getNonce()
  
        const to = multiSigWallet.address
  
        const amount = 0
  
        const callData = multiSigWallet.interface.encodeFunctionData("removeOwner", [owner.address, newSignaturesRequired])
  
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)

        expect(await multiSigWallet.getNumberOfOwners()).to.equal(1)
  
        await expect(multiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])).to.be.revertedWith("MultiSigWallet__Transfer_failed")
  
        expect(await multiSigWallet.isOwnerAddress(owner.address)).to.equal(true)
      })
    })

    describe("updateSignaturesRequired", () => {

      it("It should revert, If updateSignaturesRequired function is not being executed by the contract", async() => {

        const newSignaturesRequired = 2

        const nonce = await multiSigWallet.getNonce()
  
        const to = multiSigWallet.address
  
        const amount = 0
  
        const callData = multiSigWallet.interface.encodeFunctionData("addOwner", [userOne.address, newSignaturesRequired])
        
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)
  
        await multiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])

        expect(await multiSigWallet.getNumberOfOwners()).to.equal(2)
  
        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(true)
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(2)

        const updateSignaturesRequired = 1

        await expect(multiSigWallet.updateSignaturesRequired(updateSignaturesRequired)).to.be.revertedWith("MultiSigWallet__Not_the_contract_it_self")
        
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(2)
      })

      it("It should revert, Updating signaturesRequired to '0'", async() => {

        const newSignaturesRequired = 0
  
        const nonce = await multiSigWallet.getNonce()
  
        const to = multiSigWallet.address
  
        const amount = 0
  
        const callData = multiSigWallet.interface.encodeFunctionData("updateSignaturesRequired", [newSignaturesRequired])
  
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)
  
        await expect(multiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])).to.be.revertedWith("MultiSigWallet__Transfer_failed")
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(1)
      })

      it("It should revert, Updating signaturesRequired to '2', and there is only '1' owner", async() => {

        const newSignaturesRequired = 2
  
        const nonce = await multiSigWallet.getNonce()
  
        const to = multiSigWallet.address
  
        const amount = 0
  
        const callData = multiSigWallet.interface.encodeFunctionData("updateSignaturesRequired", [newSignaturesRequired])
        
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)

        expect(await multiSigWallet.getNumberOfOwners()).to.equal(1)
  
        await expect(multiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])).to.be.revertedWith("MultiSigWallet__Transfer_failed")
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(1)
      })
    })

    describe("executeTransaction", () => {

      it("It should revert, If executeTransaction function is not being executed by the owner", async() => {

        const newSignaturesRequired = 2
  
        const nonce = await multiSigWallet.getNonce()
  
        const to = multiSigWallet.address
  
        const amount = 0
  
        const callData = multiSigWallet.interface.encodeFunctionData("addOwner", [userOne.address, newSignaturesRequired])
        
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)

        const userTwoConnectedToMultiSigWallet = await multiSigWallet.connect(userTwo.address)

        expect(await multiSigWallet.isOwnerAddress(userTwo.address)).to.equal(false)
  
        await expect(userTwoConnectedToMultiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])).to.be.revertedWith("MultiSigWallet__Not_owner")
  
        expect(await multiSigWallet.getNumberOfOwners()).to.equal(1)

        expect(await multiSigWallet.isOwnerAddress(userOne.address)).to.equal(false)

        expect(await multiSigWallet.getSignaturesRequired()).to.equal(1)
      })

      it("It should revert, If signatures are duplicated", async() => {

        const to = multiSigWallet.address
  
        const amount = 0
  
        const newSignaturesRequired = 2
  
        const nonce = await multiSigWallet.getNonce()
  
        const addOwnerCallData = multiSigWallet.interface.encodeFunctionData("addOwner", [userTwo.address, newSignaturesRequired])
  
        const addOwnerHash = await multiSigWallet.getTransactionHash(nonce, to, amount, addOwnerCallData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [addOwnerHash, owner.address])
  
        expect(await multiSigWallet.recover(addOwnerHash, ownerSignature)).to.equal(owner.address)
  
        await multiSigWallet.executeTransaction(to, amount, addOwnerCallData, [ownerSignature])
  
        expect(await multiSigWallet.isOwnerAddress(userTwo.address)).to.equal(true)

        expect(await multiSigWallet.getNumberOfOwners()).to.equal(2)
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(2)
  
        const updateSignaturesRequired = 1
  
        const updatedNonce = await multiSigWallet.getNonce()
  
        const removeOwnerCallData = multiSigWallet.interface.encodeFunctionData("removeOwner", [userTwo.address, updateSignaturesRequired])
  
        const removeOwnerHash = await multiSigWallet.getTransactionHash(updatedNonce, to, amount, removeOwnerCallData)
  
        const userTwoSignature = await userTwo.provider.send("personal_sign", [removeOwnerHash, userTwo.address])
  
        const userTwoDuplicateSignature = await userTwo.provider.send("personal_sign", [removeOwnerHash, userTwo.address])
  
        expect(await multiSigWallet.recover(removeOwnerHash, userTwoSignature)).to.equal(userTwo.address)
  
        expect(await multiSigWallet.recover(removeOwnerHash, userTwoDuplicateSignature)).to.equal(userTwo.address)
  
        await expect(multiSigWallet.executeTransaction(to, amount, removeOwnerCallData, [userTwoSignature, userTwoDuplicateSignature])).to.be.revertedWith("MultiSigWallet__Signature_is_duplicated_OR_not_unique")
  
        expect(await multiSigWallet.isOwnerAddress(userTwo.address)).to.equal(true)

        expect(await multiSigWallet.getNumberOfOwners()).to.equal(2)
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(2)
      })

      it("It should revert, If required signatures not met", async() => {

        const to = multiSigWallet.address
  
        const amount = 0
  
        const newSignaturesRequired = 2
  
        const nonce = await multiSigWallet.getNonce()
  
        const addOwnerCallData = multiSigWallet.interface.encodeFunctionData("addOwner", [userTwo.address, newSignaturesRequired])
  
        const addOwnerHash = await multiSigWallet.getTransactionHash(nonce, to, amount, addOwnerCallData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [addOwnerHash, owner.address])
  
        expect(await multiSigWallet.recover(addOwnerHash, ownerSignature)).to.equal(owner.address)
  
        await multiSigWallet.executeTransaction(to, amount, addOwnerCallData, [ownerSignature])
  
        expect(await multiSigWallet.isOwnerAddress(userTwo.address)).to.equal(true)

        expect(await multiSigWallet.getNumberOfOwners()).to.equal(2)
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(2)
  
        const updateSignaturesRequired = 1
  
        const updatedNonce = await multiSigWallet.getNonce()
  
        const updateSignaturesCallData = multiSigWallet.interface.encodeFunctionData("updateSignaturesRequired", [updateSignaturesRequired])
  
        const updateSignaturesHash = await multiSigWallet.getTransactionHash(updatedNonce, to, amount, updateSignaturesCallData)
  
        const userTwoSignature = await userTwo.provider.send("personal_sign", [updateSignaturesHash, userTwo.address])
  
        expect(await multiSigWallet.recover(updateSignaturesHash, userTwoSignature)).to.equal(userTwo.address)
  
        await expect(multiSigWallet.executeTransaction(to, amount, updateSignaturesCallData, [userTwoSignature])).to.be.revertedWith("MultiSigWallet__Required_signatures_not_met")
  
        expect(await multiSigWallet.isOwnerAddress(userTwo.address)).to.equal(true)

        expect(await multiSigWallet.getNumberOfOwners()).to.equal(2)
  
        expect(await multiSigWallet.getSignaturesRequired()).to.equal(2)
      })

      it("Transferring '0.1' ETH to userOne", async() => {

        const userOneBeforeBalance = await multiSigWallet.provider.getBalance(userOne.address)

        const multiSigWalletBeforeBalance = await multiSigWallet.provider.getBalance(multiSigWallet.address)
  
        const nonce = await multiSigWallet.getNonce()
  
        const to = userOne.address
  
        const amount = ethers.utils.parseEther("0.1")
  
        const callData = "0x00" // This can be anything, we could send a message as well.
        
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)
  
        await multiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])
  
        const userOneAfterBalance = await multiSigWallet.provider.getBalance(userOne.address)

        const multiSigWalletAfterBalance = await multiSigWallet.provider.getBalance(multiSigWallet.address)
  
        expect(userOneAfterBalance).to.equal(userOneBeforeBalance.add(amount))

        expect(multiSigWalletAfterBalance).to.equal(multiSigWalletBeforeBalance.sub(amount))
      })

      it("Allowing userOne to spend 10 hopium tokens. Then userOne transfers the hopium tokens to userTwo", async() => {

        const nonce = await multiSigWallet.getNonce()
  
        const to = hopiumToken.address
  
        const amount = 0
  
        const hopiumTokenAmount = "10"
  
        const callData = hopiumToken.interface.encodeFunctionData("approve", [userOne.address, hopiumTokenAmount])
        
        const hash = await multiSigWallet.getTransactionHash(nonce, to, amount, callData)
  
        const ownerSignature = await owner.provider.send("personal_sign", [hash, owner.address])
  
        expect(await multiSigWallet.recover(hash, ownerSignature)).to.equal(owner.address)
  
        await multiSigWallet.executeTransaction(to, amount, callData, [ownerSignature])
  
        const userOneAllowance = await hopiumToken.allowance(multiSigWallet.address, userOne.address)
        
        expect(userOneAllowance).to.equal(hopiumTokenAmount)
  
        await hopiumToken.connect(userOne).transferFrom(multiSigWallet.address, userTwo.address, hopiumTokenAmount)
  
        const userTwoHopiumBalance = await hopiumToken.balanceOf(userTwo.address)

        const multiSigWalletHopiumBalance = await hopiumToken.balanceOf(multiSigWallet.address)
  
        expect(userTwoHopiumBalance).to.equal(hopiumTokenAmount)

        expect(multiSigWalletHopiumBalance).to.equal(hopiumTokenTotalSupply - hopiumTokenAmount)
      })
    })
  })
})