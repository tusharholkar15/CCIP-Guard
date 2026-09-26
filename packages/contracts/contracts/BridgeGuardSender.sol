// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

contract BridgeGuardSender {
    IRouterClient public immutable router;
    uint64 public constant DESTINATION_CHAIN_SELECTOR = 3478487238524512106; // Arbitrum Sepolia

    event BridgeGuardMessageSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address receiver,
        string text,
        address feeToken,
        uint256 fees
    );

    constructor(address _router) {
        router = IRouterClient(_router);
    }

    function sendData(
        uint64 destinationChainSelector,
        address receiver,
        string calldata text
    ) external payable returns (bytes32 messageId) {
        require(destinationChainSelector == DESTINATION_CHAIN_SELECTOR, "Invalid destination chain");

        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode(text),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(Client.GenericExtraArgsV2({
                gasLimit: 200_000,
                allowOutOfOrderExecution: true
            })),
            feeToken: address(0)
        });

        uint256 fees = router.getFee(destinationChainSelector, evm2AnyMessage);
        require(msg.value >= fees, "Insufficient fee");

        messageId = router.ccipSend{value: fees}(destinationChainSelector, evm2AnyMessage);

        emit BridgeGuardMessageSent(messageId, destinationChainSelector, receiver, text, address(0), fees);

        if (msg.value > fees) {
            (bool success, ) = msg.sender.call{value: msg.value - fees}("");
            require(success, "Refund failed");
        }
    }
}
