// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

interface IAny2EVMMessageReceiver {
    function ccipReceive(Client.Any2EVMMessage calldata message) external;
}

contract BridgeGuardReceiver is IAny2EVMMessageReceiver {
    address internal immutable i_ccipRouter;
    uint64 public constant SOURCE_CHAIN_SELECTOR = 16015286601757825753; // Ethereum Sepolia
    address public bridgeGuardSender;

    event BridgeGuardMessageReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChainSelector,
        address sender,
        string text
    );

    bytes32 public latestMessageId;
    uint64 public latestSourceChainSelector;
    address public latestSender;
    string public latestText;

    constructor(address _router, address _sender) {
        i_ccipRouter = _router;
        bridgeGuardSender = _sender;
    }

    modifier onlyRouter() {
        require(msg.sender == i_ccipRouter, "Invalid router");
        _;
    }

    function ccipReceive(Client.Any2EVMMessage calldata any2EvmMessage) external override onlyRouter {
        require(any2EvmMessage.sourceChainSelector == SOURCE_CHAIN_SELECTOR, "Invalid source chain");
        address sender = abi.decode(any2EvmMessage.sender, (address));
        require(sender == bridgeGuardSender, "Invalid sender");

        latestMessageId = any2EvmMessage.messageId;
        latestSourceChainSelector = any2EvmMessage.sourceChainSelector;
        latestSender = sender;
        latestText = abi.decode(any2EvmMessage.data, (string));

        emit BridgeGuardMessageReceived(latestMessageId, latestSourceChainSelector, latestSender, latestText);
    }

    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return interfaceId == type(IAny2EVMMessageReceiver).interfaceId || interfaceId == 0x01ffc9a7; // IERC165
    }
}
