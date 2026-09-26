import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_CHAINS,
  CHAIN_ID_TO_NAME,
  CHAIN_NAME_TO_ID,
  CCIP_FEE_TOKENS,
  chainIdToSelector,
  selectorToChainId,
} from '../index';

describe('CCIP Chain Configuration', () => {
  describe('SUPPORTED_CHAINS', () => {
    it('should have Ethereum Mainnet configured correctly', () => {
      const eth = SUPPORTED_CHAINS.ETHEREUM;
      expect(eth.chainId).toBe(1);
      expect(eth.name).toBe('ethereum');
      expect(eth.chainSelector).toBe(BigInt('5009297550715157269'));
      expect(eth.routerAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have Arbitrum Mainnet configured correctly', () => {
      const arb = SUPPORTED_CHAINS.ARBITRUM;
      expect(arb.chainId).toBe(42161);
      expect(arb.name).toBe('arbitrum');
      expect(arb.chainSelector).toBe(BigInt('4949039107694359620'));
      expect(arb.routerAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have correct router addresses', () => {
      expect(SUPPORTED_CHAINS.ETHEREUM.routerAddress)
        .toBe('0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D');
      expect(SUPPORTED_CHAINS.ARBITRUM.routerAddress)
        .toBe('0x141fa059441E0ca23ce184B6A78bafD2A517DdE8');
    });

    it('should have unique chain IDs', () => {
      const chainIds = Object.values(SUPPORTED_CHAINS).map(c => c.chainId);
      expect(new Set(chainIds).size).toBe(chainIds.length);
    });

    it('should have unique chain selectors', () => {
      const selectors = Object.values(SUPPORTED_CHAINS).map(c => c.chainSelector.toString());
      expect(new Set(selectors).size).toBe(selectors.length);
    });
  });

  describe('Chain ID <-> Selector mapping', () => {
    it('should map Ethereum Mainnet chain ID to selector', () => {
      expect(chainIdToSelector(1)).toBe(BigInt('5009297550715157269'));
    });

    it('should map Arbitrum Mainnet chain ID to selector', () => {
      expect(chainIdToSelector(42161)).toBe(BigInt('4949039107694359620'));
    });

    it('should return 0n for unknown chain ID', () => {
      expect(chainIdToSelector(99999)).toBe(0n);
    });

    it('should map Ethereum Mainnet selector to chain ID', () => {
      expect(selectorToChainId(BigInt('5009297550715157269'))).toBe(1);
    });

    it('should map Arbitrum Mainnet selector to chain ID', () => {
      expect(selectorToChainId(BigInt('4949039107694359620'))).toBe(42161);
    });

    it('should return 0 for unknown selector', () => {
      expect(selectorToChainId(BigInt('999999999'))).toBe(0);
    });
  });

  describe('Chain lookup maps', () => {
    it('should have correct CHAIN_ID_TO_NAME entries', () => {
      expect(CHAIN_ID_TO_NAME[1]).toBe('Ethereum');
      expect(CHAIN_ID_TO_NAME[42161]).toBe('Arbitrum');
    });

    it('should have correct CHAIN_NAME_TO_ID entries', () => {
      expect(CHAIN_NAME_TO_ID['ethereum']).toBe(1);
      expect(CHAIN_NAME_TO_ID['arbitrum']).toBe(42161);
    });
  });

  describe('CCIP Fee Tokens', () => {
    it('should have native token (zero address) for both chains', () => {
      expect(CCIP_FEE_TOKENS.ETHEREUM.NATIVE)
        .toBe('0x0000000000000000000000000000000000000000');
      expect(CCIP_FEE_TOKENS.ARBITRUM.NATIVE)
        .toBe('0x0000000000000000000000000000000000000000');
    });

    it('should have LINK token addresses with valid format', () => {
      expect(CCIP_FEE_TOKENS.ETHEREUM.LINK).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(CCIP_FEE_TOKENS.ARBITRUM.LINK).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });
});
