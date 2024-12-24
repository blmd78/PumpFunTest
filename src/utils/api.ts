// api.ts

import axios from 'axios';
import { Token, TokenWithLiquidityEvents, PaginatedResponse, LiquidityEvent, TokenWithTransactions, PriceResponse, HistoricalPrice, USDHistoricalPrice, TokenHolder, TransactionResponse } from '@/interface/types';
import { ethers } from 'ethers';


const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function getAllTokens(page = 1, pageSize = 20): Promise<PaginatedResponse<Token>> {
  console.log("getAllTokens",page,pageSize);
  const skip = (page - 1) * pageSize;

  const query = `
    query GetAllTokens($first: Int, $skip: Int) {
      tokenCreateds(first: $first, skip: $skip) {
        id
        name
        symbol
        pool
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `;

  const variables = {
    first: pageSize,
    skip: skip
  };

  try {
    const response = await fetch('http://35.234.119.105:8000/subgraphs/name/likeaser-testnet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: variables
      }),
    });

    const result = await response.json();
    console.log(result);
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return {
        data: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 0,
        tokens: []
      };
    }

    const tokens = result.data.tokenCreateds.map((token: any) => ({
      id: token.id,
      address: token.id,
      name: token.name,
      symbol: token.symbol,
      // Add other fields as needed
    }));

    return {
      data: tokens,
      totalCount: tokens.length, // Adjust this if you have a way to get the total count
      currentPage: page,
      totalPages: Math.ceil(tokens.length / pageSize), // Adjust this if you have a way to get the total pages
      tokens: [] // This field seems redundant based on your interface
    };
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return {
      data: [],
      totalCount: 0,
      currentPage: page,
      totalPages: 0,
      tokens: []
    };
  }
}


export async function getRecentTokens(page: number = 1, pageSize: number = 20, hours: number = 1): Promise<PaginatedResponse<Token>> {
  console.log("getRecentTokens",page,pageSize,hours);
  const skip = (page - 1) * pageSize;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const hoursAgoTimestamp = currentTimestamp - (hours * 3600);

  const query = `
    query GetRecentTokens($first: Int!, $skip: Int!, $timestamp: BigInt!) {
      tokenCreateds(
        first: $first
        skip: $skip
        where: { blockTimestamp_gt: $timestamp }
        orderBy: blockTimestamp
        orderDirection: desc
      ) {
        id      
        name
        symbol
        pool
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `;

  const variables = {
    first: pageSize,
    skip: skip,
    timestamp: hoursAgoTimestamp.toString()
  };

  try {
    const response = await fetch('http://35.234.119.105:8000/subgraphs/name/likeaser-testnet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error('Failed to fetch recent tokens');
    }

    const tokens = result.data.tokenCreateds.map((token: any) => ({
      id: token.id,
      address: token.id,
      name: token.name,
      symbol: token.symbol,
      creatorAddress: '',
      logo: '',
      description: '',
      createdAt: new Date(parseInt(token.blockTimestamp) * 1000).toISOString(),
      updatedAt: new Date(parseInt(token.blockTimestamp) * 1000).toISOString(),
      _count: {
        liquidityEvents: 0
      }
    }));

    return {
      data: tokens,
      totalCount: tokens.length,
      currentPage: page,
      totalPages: Math.ceil(tokens.length / pageSize),
      tokens: []
    };
  } catch (error) {
    console.error('Error fetching recent tokens:', error);
    throw error;
  }
}

export async function searchTokens(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<Token>> {
  const skip = (page - 1) * pageSize;

  const graphqlQuery = `
    query SearchTokens($first: Int!, $skip: Int!, $searchQuery: String!) {
      tokenCreateds(
        first: $first
        skip: $skip
        where: { 
          or: [
            { name_contains_nocase: $searchQuery },
            { symbol_contains_nocase: $searchQuery },

          ]
        }
        orderBy: blockTimestamp
        orderDirection: desc
      ) {
        id
        name
        symbol
        pool
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `;

  const variables = {
    first: pageSize,
    skip: skip,
    searchQuery: query
  };

  try {
    const response = await fetch('http://35.234.119.105:8000/subgraphs/name/likeaser-testnet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error('Failed to search tokens');
    }

    const tokens = result.data.tokenCreateds.map((token: any) => ({
      id: token.id,
      address: token.id,
      name: token.name,
      symbol: token.symbol,
      creatorAddress: '',
      logo: '',
      description: '',
      createdAt: new Date(parseInt(token.blockTimestamp) * 1000).toISOString(),
      updatedAt: new Date(parseInt(token.blockTimestamp) * 1000).toISOString(),
      _count: {
        liquidityEvents: 0
      }
    }));

    return {
      data: tokens,
      totalCount: tokens.length,
      currentPage: page,
      totalPages: Math.ceil(tokens.length / pageSize),
      tokens: []
    };
  } catch (error) {
    console.error('Error searching tokens:', error);
    throw error;
  }
}

export async function getTokensWithLiquidity(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<TokenWithLiquidityEvents>> {
  const response = await axios.get(`${API_BASE_URL}/api/tokens/with-liquidityEvent`, {
    params: { page, pageSize }
  });
  return response.data;
}

export async function getTokenByAddress(address: string): Promise<Token> {
  address = address.toLowerCase();
  console.log("getTokenByAddress",address);
  const query = `
    query GetToken($address: String!) {
      tokenCreated(id: $address) {
        id
        name
        symbol
        pool
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `;

  const variables = {
    address: address.toLowerCase()
  };

  try {
    const response = await fetch('http://35.234.119.105:8000/subgraphs/name/likeaser-testnet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error('Failed to fetch token');
    }

    const tokenData = result.data.tokenCreated;
    if (!tokenData) {
      throw new Error('Token not found');
    }

    return {
      id: tokenData.id,
      address: tokenData.id,
      name: tokenData.name,
      symbol: tokenData.symbol,
      creatorAddress: '',
      logo: '',
      description: '',
      createdAt: new Date(parseInt(tokenData.blockTimestamp) * 1000).toISOString(),
      updatedAt: new Date(parseInt(tokenData.blockTimestamp) * 1000).toISOString(),
      _count: {
        liquidityEvents: 0
      }
    };
  } catch (error) {
    console.error('Error fetching token:', error);
    throw error;
  }
}

// get DEX liquidity provision events
export async function getTokenLiquidityEvents(
  tokenId: string, 
  page: number = 1, 
  pageSize: number = 20
): Promise<PaginatedResponse<LiquidityEvent>> {
  console.log("getTokenLiquidityEvents",tokenId,page,pageSize);
  const skip = (page - 1) * pageSize;
  return {
    data: [],
    totalCount: 0,
    currentPage: page,
    totalPages: 0,
    tokens: []
  }
  const query = `
    query GetLiquidityEvents($tokenId: String!, $first: Int!, $skip: Int!) {
      tokenCreated(id: $tokenId) {
        transactions(
          first: $first
          skip: $skip
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          ethAmountAfterTax
          tokenAmount
          timestamp
        }
      }
    }
  `;

  const variables = {
    tokenId,
    first: pageSize,
    skip: skip
  };

  try {
    const response = await fetch('http://35.234.119.105:8000/subgraphs/name/likeaser-testnet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      }),
    });

    const result = await response.json();
    console.log("getTokenLiquidityEvents result",result);
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return {
        data: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 0,
        tokens: []
      };
    }

    const events = result.data.tokenCreated.transactions.map((event: any) => ({
      id: event.id,
      ethAmount: event.ethAmountAfterTax,
      tokenAmount: event.tokenAmount,
      timestamp: event.timestamp
    }));

    return {
      data: events,
      totalCount: events.length,
      currentPage: page,
      totalPages: Math.ceil(events.length / pageSize),
      tokens: []
    };
  } catch (error) {
    console.error('Error fetching liquidity events:', error);
    return {
      data: [],
      totalCount: 0,
      currentPage: page,
      totalPages: 0,
      tokens: []
    };
  }
}

export async function getTokenInfoAndTransactions(
  address: string,
  transactionPage: number = 1,
  transactionPageSize: number = 10
): Promise<TokenWithTransactions> {
  console.log("getTokenInfoAndTransactions",address);
  const skip = (transactionPage - 1) * transactionPageSize;

  const query = `
    query GetTokenInfoAndTransactions($address: String!, $first: Int!, $skip: Int!) {
      tokenCreated( id: $address ) {
        id
        name
        symbol
        pool{id}
        blockNumber
        blockTimestamp
        transactionHash
      }
      transactions: transactions(
        first: $first
        skip: $skip
        where: { token: $address }
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        type
        senderAddress
        recipientAddress
        ethAmountAfterTax
        tokenAmount
        tokenPrice
        txHash
        timestamp
        pool{id}
        tax
      }
    }
  `;

  const variables = {
    address: address.toLowerCase(),
    first: transactionPageSize,
    skip: skip
  };

  try {
    const response = await fetch('http://35.234.119.105:8000/subgraphs/name/likeaser-testnet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      }),
    });

    const result = await response.json();
    console.log("getTokenInfoAndTransactions",result);
    if (result.errors) {
      throw new Error('Failed to fetch token info');
    }

    const tokenData = result.data.tokenCreated;
    if (!tokenData) {
    throw new Error('Token not found');
  }
  const transactions = result.data.transactions || []

    return {
      id: tokenData.id,
      address: tokenData.id,
      name: tokenData.name,
      symbol: tokenData.symbol,
      creatorAddress: '', // This might need to come from a different query
      logo: '', // This would come from your MongoDB metadata
      description: '', // This would come from your MongoDB metadata
      createdAt: new Date(parseInt(tokenData.blockTimestamp) * 1000).toISOString(),
      updatedAt: new Date(parseInt(tokenData.blockTimestamp) * 1000).toISOString(),
      _count: {
        liquidityEvents: 0
      },
      youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      discord: "https://discord.gg/likeaser ",
      twitter: "https://twitter.com/likeaser",
      website: "https://likeaser.io",
      telegram: "https://t.me/likeaser",
      transactions: {
        data: transactions.map((tx: any) => ({
          id: tx.id,
          type: tx.type,
          senderAddress: tx.senderAddress,
          recipientAddress: tx.recipientAddress,
          ethAmount: tx.ethAmountAfterTax,
          tokenAmount: tx.tokenAmount,
          tokenPrice: tx.tokenPrice,
          txHash: tx.txHash,
          timestamp: new Date(parseInt(tx.timestamp) * 1000).toISOString(),
          poolAddress: tx.pool,
          tax: tx.tax
        })),
        pagination: {
          currentPage: transactionPage,
          pageSize: transactionPageSize,
          totalCount: transactions.length,
          totalPages: Math.ceil(transactions.length / transactionPageSize)
        }
      }
    };
  } catch (error) {
    console.error('Error fetching token info:', error);
    throw error;
  }
}


//historical price
export async function getHistoricalPriceData(address: string): Promise<HistoricalPrice[]> {
  const response = await axios.get(`${API_BASE_URL}/api/tokens/address/${address}/historical-prices`);
  return response.data;
}

//eth price usd
export async function getCurrentPrice(): Promise<string> {
  try {
    const response = await axios.get<PriceResponse>(`${API_BASE_URL}/api/price`);
    return response.data.price;
  } catch (error) {
    console.error('Error fetching current price:', error);
    throw new Error('Failed to fetch current price');
  }
}


export async function getTokenUSDPriceHistory(address: string): Promise<USDHistoricalPrice[]> {
  try {
    const [ethPrice, historicalPrices] = await Promise.all([
      getCurrentPrice(),
      getHistoricalPriceData(address)
    ]);

    return historicalPrices.map((price: HistoricalPrice) => {
      const tokenPriceInWei = ethers.BigNumber.from(price.tokenPrice);
      const tokenPriceInETH = ethers.utils.formatEther(tokenPriceInWei);
      const tokenPriceUSD = parseFloat(tokenPriceInETH) * parseFloat(ethPrice);

      return {
        tokenPriceUSD: tokenPriceUSD.toFixed(9),  // Adjust decimal places as needed
        timestamp: price.timestamp
      };
    });
  } catch (error) {
    console.error('Error calculating USD price history:', error);
    throw new Error('Failed to calculate USD price history');
  }
}


export async function updateToken(
  address: string, 
  data: {
    logo?: string;
    description?: string;
    website?: string;
    telegram?: string;
    discord?: string;
    twitter?: string;
    youtube?: string;
  }
): Promise<Token> {
  try {
    const response = await axios.patch(`${API_BASE_URL}/api/tokens/update/${address}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating token:', error);
    throw new Error('Failed to update token');
  }
}

// get all transaction associated with a particular address
export async function getTransactionsByAddress(
  address: string, 
  page: number = 1, 
  pageSize: number = 10
): Promise<TransactionResponse> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/transactions/address/${address}`, {
      params: { page, pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw new Error('Failed to fetch transactions');
  }
}

// POST /chats: Add a new chat message with optional reply_to
export async function addChatMessage(
  user: string, 
  token: string, 
  message: string, 
  replyTo?: number
): Promise<{ id: number }> {
  try {
    const response = await axios.post(`${API_BASE_URL}/chats`, {
      user,
      token,
      message,
      reply_to: replyTo  // Optional: ID of the message being replied to
    });
    return response.data;
  } catch (error) {
    console.error('Error adding chat message:', error);
    throw new Error('Failed to add chat message');
  }
}

// GET /chats: Get chat messages for a specific token
export async function getChatMessages(token: string): Promise<Array<{
  id: number;
  user: string;
  token: string;
  message: string;
  reply_to: number | null;
  timestamp: string;
}>> {
  try {
    const response = await axios.get(`${API_BASE_URL}/chats`, {
      params: { token }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    throw new Error('Failed to fetch chat messages');
  }
}

//get all token address
export async function getAllTokenAddresses(): Promise<Array<{address: string, symbol: string}>> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/tokens/addresses`);
    return response.data;
  } catch (error) {
    console.error('Error fetching token addresses and symbols:', error);
    throw new Error('Failed to fetch token addresses and symbols');
  }
}

export async function getTokensByCreator(
  creatorAddress: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<Token>> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/tokens/creator/${creatorAddress}`, {
      params: { page, pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching tokens by creator:', error);
    throw new Error('Failed to fetch tokens by creator');
  }
}


//blockexplorer Get token Holders
export async function getTokenHolders(tokenAddress: string): Promise<TokenHolder[]> {
  try {
    const response = await axios.get(`https://www.rootstock.blockscout.com/api/v2/tokens/${tokenAddress}/holders`);
    const data = response.data;

    return data.items.map((item: any) => {
      return {
        address: item.address.hash,
        balance: item.value
      };
    });
  } catch (error) {
    console.error('Error fetching token holders:', error);
    throw new Error('Failed to fetch token holders');
  }
}

export async function getTokenPool(tokenAddress: string): Promise<string> {
  const query = `
    query GetTokenPool($address: String!) {
      tokenCreated(id: $address) {
        pool {
          id
        }
      }
    }
  `;

  const variables = {
    address: tokenAddress.toLowerCase()
  };

  try {
    const response = await fetch('http://35.234.119.105:8000/subgraphs/name/likeaser-testnet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error('Failed to fetch token pool');
    }

    if (!result.data?.tokenCreated?.pool?.id) {
      throw new Error('Pool not found for token');
    }

    return result.data.tokenCreated.pool.id;
  } catch (error) {
    console.error('Error fetching token pool:', error);
    throw error;
  }
}

