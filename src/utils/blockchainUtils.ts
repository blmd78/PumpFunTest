import { formatUnits, parseUnits, maxUint256, decodeEventLog, Log, TransactionReceipt, UserRejectedRequestError } from 'viem';
import { useReadContract, useWriteContract, useBalance, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import BondingCurveManagerABI from '@/abi/BondingCurveManager.json';
import LiquidityPoolABI from '@/abi/LiquidityPool.json';
import TokenFactoryABI from '@/abi/TokenFactory.json';
import ERC20ABI from '@/abi/ERC20.json';
import { useCallback } from 'react';
import { getTokenPool } from './api';

const BONDING_CURVE_MANAGER_ADDRESS = '0x2a0B34a43b477fA9355AC2c8e54Da3c57067DDF4' as `0x${string}`; // Testnet
const CREATION_FEE = parseUnits('0.0002', 18);

export function useCurrentTokenPrice(poolAddress: `0x${string}`) {
  const { data, refetch } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: LiquidityPoolABI,
    functionName: 'getCurrentTokenPrice',
    args: [],
  });
  return { data: data as bigint | undefined, refetch };
}

export function useTotalSupply(tokenAddress: `0x${string}`) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'totalSupply',
  });
}

export function useTokenLiquidity(poolAddress: `0x${string}`) {
  const { data, refetch } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: LiquidityPoolABI,
    functionName: 'getReserves',
    args: [],
  });
  return { data: data as [bigint, bigint] | undefined, refetch };
}

export function useCalcBuyReturn(poolAddress: `0x${string}`, ethAmount: bigint) {
  const { data, isLoading } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: LiquidityPoolABI,
    functionName: 'calculateCurvedBuyReturn',
    args: [ethAmount],
  });
  return { data: data as bigint | undefined, isLoading };
}

export function useCalcSellReturn(poolAddress: `0x${string}`, tokenAmount: bigint) {
  const { data, isLoading } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: LiquidityPoolABI,
    functionName: 'calculateCurvedSellReturn',
    args: [tokenAmount],
  });
  return { data: data as bigint | undefined, isLoading };
}

export function useUserBalance(userAddress: `0x${string}`, tokenAddress: `0x${string}`) {
  const { data: ethBalance, refetch: refetchEthBalance } = useBalance({
    address: userAddress,
  });

  const { data: tokenBalance, refetch: refetchTokenBalance } = useBalance({
    address: userAddress,
    token: tokenAddress,
  });

  const refetch = useCallback(() => {
    refetchEthBalance();
    refetchTokenBalance();
  }, [refetchEthBalance, refetchTokenBalance]);

  return {
    ethBalance: ethBalance?.value,
    tokenBalance: tokenBalance?.value,
    refetch,
  };
}

export function useERC20Balance(tokenAddress: `0x${string}`, walletAddress: `0x${string}`) {
  const { data, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [walletAddress],
  });

  return { 
    balance: data as bigint | undefined, 
    refetch 
  };
}

export function useTokenAllowance(tokenAddress: `0x${string}`, owner: `0x${string}`, spender: `0x${string}`) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: [owner, spender],
  }) as { data: bigint | undefined };
}

export function useCreateToken() {
  const { writeContractAsync } = useWriteContract();
  const { data: transactionReceipt, isLoading, isSuccess, isError, error } = useWaitForTransactionReceipt();
  const publicClient = usePublicClient();

  const createToken = async (name: string, symbol: string, initialPurchaseAmount: bigint) => {
    if (!publicClient) {
      throw new Error('Public client is not available');
    }

    try {
      console.log('Initiating token creation transaction...');
      const totalValue = CREATION_FEE + initialPurchaseAmount;
      const hash = await writeContractAsync({
        address: BONDING_CURVE_MANAGER_ADDRESS,
        abi: TokenFactoryABI,
        functionName: 'createToken',
        args: [name, symbol],
        value: totalValue,
      });
      console.log('Token creation transaction sent. Hash:', hash);

      console.log('Waiting for transaction confirmation...');
      let receipt: TransactionReceipt | null = null;
      let attempts = 0;
      const maxAttempts = 30; // a maximum of 30 * 2 seconds

      while (!receipt && attempts < maxAttempts) {
        if (isSuccess && transactionReceipt) {
          receipt = transactionReceipt;
          break;
        }

        if (isError) {
          console.error('Transaction failed:', error?.message);
          throw new Error('Transaction failed: ' + error?.message);
        }

        // Manual check for transaction receipt
        try {
          receipt = await publicClient.getTransactionReceipt({ hash });
          if (receipt) break;
        } catch (e) {
          console.log('Error fetching receipt, will retry:', e);
        }

        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for 3 seconds
        attempts++;
        console.log(`Still waiting for confirmation... Attempt ${attempts}/${maxAttempts}`);
      }

      if (!receipt) {
        console.error('Transaction confirmation timeout');
        throw new Error('Transaction confirmation timeout');
      }

      console.log('Transaction confirmed. Receipt:', receipt);

      const tokenCreatedLog = receipt.logs.find(log => 
        log.address.toLowerCase() === BONDING_CURVE_MANAGER_ADDRESS.toLowerCase()
      ) as Log | undefined;

      if (tokenCreatedLog) {
        console.log('TokenCreated event found in logs');
        const decodedLog = decodeEventLog({
          abi: TokenFactoryABI,
          data: tokenCreatedLog.data,
          topics: tokenCreatedLog.topics,
        }) as unknown as { eventName: string; args: { tokenAddress: `0x${string}`; creator: `0x${string}`; name: string; symbol: string; poolAddress: `0x${string}` } };

        if (decodedLog.eventName === 'TokenCreated' && decodedLog.args) {
          console.log('Token created successfully. Address:', decodedLog.args.tokenAddress);
          return decodedLog.args.tokenAddress;
        }
      }

      console.error('TokenCreated event not found in transaction logs');
      throw new Error('TokenCreated event not found in transaction logs');
    } catch (error) {
      
      console.error('Error in createToken function:', error);
      if (error instanceof UserRejectedRequestError) {
        throw error;
      }

      throw error;
    }
  };

  return { createToken, isLoading: isLoading || isSuccess === false , UserRejectedRequestError};
}

export function useBuyTokens() {
  const { writeContractAsync, data, error, isPending } = useWriteContract();

  const buyTokens = async (poolAddress: `0x${string}`, ethAmount: bigint, 
    minReturn: bigint = BigInt(0), deadline: bigint = BigInt(maxUint256)) => {
    try {     
      const result = await writeContractAsync({
        address: poolAddress as `0x${string}`,
        abi: LiquidityPoolABI,
        functionName: 'buyToken',
        args: [minReturn, deadline],
        value: ethAmount,
      });
      return result;
    } catch (error) {
      console.error('Buy tokens error:', error);
      throw error;
    }
  };

  return { buyTokens, data, error, isPending };
}

export function useSellTokens() {
  const { writeContractAsync, data, error, isPending } = useWriteContract();

  const sellTokens = async (poolAddress: `0x${string}`, amount: bigint, 
    minReturn: bigint = BigInt(0), deadline: bigint = BigInt(maxUint256)) => {
    try {
      const result = await writeContractAsync({
        address: poolAddress as `0x${string}`,
        abi: LiquidityPoolABI,
        functionName: 'sellToken',
        args: [amount, minReturn, deadline],
      });
      return result;
    } catch (error) {
      console.error('Sell tokens error:', error);
      throw error;
    }
  };

  return { sellTokens, data, error, isPending };
}

export function useApproveTokens() {
  const { writeContractAsync, data, error, isPending } = useWriteContract();

  const approveTokens = async (tokenAddress: `0x${string}`, poolAddress: `0x${string}`) => {
    try {
      const result = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [poolAddress, maxUint256],
      });
      return result;
    } catch (error) {
      console.error('Approve tokens error:', error);
      throw error;
    }
  };

  return { approveTokens, data, error, isPending };
}

export const formatAmountV3 = (amount: string, decimals: number = 18) => {
  const formattedAmount = parseFloat(formatUnits(BigInt(amount), decimals));
  
  const format = (value: number, maxDecimals: number) => {
    const rounded = value.toFixed(maxDecimals);
    const withoutTrailingZeros = parseFloat(rounded).toString();
    return withoutTrailingZeros;
  };

  if (formattedAmount >= 1e12) {
    return `${format(formattedAmount / 1e12, 2)}T`;
  } else if (formattedAmount >= 1e9) {
    return `${format(formattedAmount / 1e9, 2)}B`;
  } else if (formattedAmount >= 1e6) {
    return `${format(formattedAmount / 1e6, 2)}M`;
  } else if (formattedAmount >= 1e3) {
    return `${format(formattedAmount / 1e3, 2)}k`;
  } else if (formattedAmount >= 1) {
    return format(formattedAmount, 2);
  } else {
    const decimals = Math.min(6, Math.max(2, 3 - Math.floor(Math.log10(formattedAmount))));
    return format(formattedAmount, decimals);
  }
};

export function formatTimestamp(timestamp: string): string {
  const now = new Date();
  const date = new Date(Number(timestamp) * 1000);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

export const formatAmount = (amount: string, decimals: number = 18) => {
  const formattedAmount = parseFloat(formatUnits(BigInt(amount), decimals));
  if (formattedAmount >= 1e12) {
    return `${(formattedAmount / 1e12).toFixed(4)}T`;
  } else if (formattedAmount >= 1e9) {
    return `${(formattedAmount / 1e9).toFixed(4)}B`;
  } else if (formattedAmount >= 1e6) {
    return `${(formattedAmount / 1e6).toFixed(4)}M`;
  } else if (formattedAmount >= 1e3) {
    return `${(formattedAmount / 1e3).toFixed(4)}k`;
  } else {
    return formattedAmount.toFixed(8);
  }
};
export const formatAmountV2 = (amount: string, decimals: number = 18) => {
  const formattedAmount = parseFloat(formatUnits(BigInt(amount), decimals));
  if (formattedAmount >= 1e12) {
    return `${(formattedAmount / 1e12).toFixed(1)}T`;
  } else if (formattedAmount >= 1e9) {
    return `${(formattedAmount / 1e9).toFixed(2)}B`;
  } else if (formattedAmount >= 1e6) {
    return `${(formattedAmount / 1e6).toFixed(2)}M`;
  } else if (formattedAmount >= 1e3) {
    return `${(formattedAmount / 1e3).toFixed(2)}k`;
  } else {
    return formattedAmount.toFixed(3);
  }
};

export function formatAddressV2(address: string): string {
  const lastSix = address.slice(-6);
  return `${lastSix}`;
}

export function shortenAddress(address: string): string {
  return address.slice(2, 8);
}

export function getExplorerUrl(txHash: string): string {
  return `https://rootstock.blockscout.com/tx/${txHash}`;
}
