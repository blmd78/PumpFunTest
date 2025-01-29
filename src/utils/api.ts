// api.ts

import axios from 'axios';
import { Token, TokenWithLiquidityEvents, PaginatedResponse, LiquidityEvent, TokenWithTransactions, PriceResponse, HistoricalPrice, USDHistoricalPrice, TokenHolder, TransactionResponse } from '@/interface/types';
import { ethers } from 'ethers';
import { useChainId } from 'wagmi';


const API_BASE_URL = typeof window === 'undefined' ? process.env.NEXT_PUBLIC_API_BASE_URL : '';
// const SUBGRAPH_URL = typeof window === 'undefined' 
//   ? process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'http://35.198.140.39:8000/subgraphs/name/likeaser-testnet'
//   : '/api/subgraph';
const SUBGRAPH_URL = typeof window === 'undefined' 
  ? process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'https://api.studio.thegraph.com/query/90229/likeaser/version/latest'
  : '/api/subgraph';

let requestCounter = 0;

export async function getAllTokens(page = 1, pageSize = 20): Promise<PaginatedResponse<Token>> {
  const requestId = ++requestCounter;
  let time = Date.now();
  // console.log(`[Request ${requestId}] getAllTokens started at ${time}`);

  const skip = (page - 1) * pageSize;

  const query = `
    query GetAllTokens($first: Int, $skip: Int) {
      tokenCreateds(
        first: $first
        skip: $skip
        orderBy: blockTimestamp
        orderDirection: desc
        where: {
          pool_: {
            migrated: false
          }
        }
      ) {
        id
        name
        symbol
        pool
        blockNumber
        blockTimestamp
        transactionHash
        creator{id}
        pool {
          migrated
        }
      }
    }
  `;

  const variables = {
    first: pageSize,
    skip: skip
  };
  // console.log("start fetching graphql", Date.now() - time)
  time = Date.now();
  try {
    // Get blockchain data from subgraph
    const graphqlResponse = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: variables
      }),
    });

    const result = await graphqlResponse.json();
    // console.log(`[Request ${requestId}] GraphQL response after`, Date.now() - time);
    time = Date.now();
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

    // Transform subgraph data
    const tokens = await Promise.all(result.data.tokenCreateds.map(async (token: any) => {
      try {
        // Fetch metadata for each token
        // const checksumAddress = ethers.utils.getAddress(token.id);
        // const metadataResponse = await fetch(`${API_BASE_URL}/api/tokens/address/${checksumAddress}`);
        // console.log(`[Request ${requestId}] Database Response`, Date.now() - time)
        // time = Date.now();
        // const metadata = await metadataResponse.json();

        return {
          id: token.id,
          address: token.id,
          name: token.name,
          symbol: token.symbol,
          creatorAddress: token.creator.id,
          // logo: metadata.token.logo || '',
          // description: metadata.token.description || '',
          createdAt: token.blockTimestamp,
          updatedAt: token.blockTimestamp,
          migrated: token.pool.migrated,
          _count: {
            liquidityEvents: 0
          }
        };
      } catch (error) {
        console.error(`Error fetching metadata for token ${token.id}:`, error);
        // Return token without metadata if fetch fails
        return {
          id: token.id,
          address: token.id,
          name: token.name,
          symbol: token.symbol,
          creatorAddress: token.creator.id,
          logo: '',
          description: '',
          createdAt: token.blockTimestamp,
          updatedAt: token.blockTimestamp,
          migrated: token.pool.migrated,
          _count: {
            liquidityEvents: 0
          }
        };
      }
    }));
    // console.log(`[Request ${requestId}] Fetch completed`, Date.now() - time);
    return {
      data: tokens,
      totalCount: tokens.length,
      currentPage: page,
      totalPages: Math.ceil(tokens.length / pageSize),
      tokens: []
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
    const response = await fetch(SUBGRAPH_URL, {
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
    const response = await fetch(SUBGRAPH_URL, {
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
  const skip = (page - 1) * pageSize;
  
  const query = `
    query GetTokensWithLiquidity($first: Int, $skip: Int) {
      tokenCreateds(
        first: $first
        skip: $skip
        orderBy: blockTimestamp
        orderDirection: desc
        where: {
          pool_: {
            migrated: true
          }
        }
      ) {
        id
        name
        symbol
        pool
        blockNumber
        blockTimestamp
        transactionHash
        creator{id}
        pool {
          migrated
          migration{
            id
            amount0
            amount1
            timestamp
          }
        }
      }
    }
  `;

  const variables = {
    first: pageSize,
    skip: skip
  };

  try {
    const response = await fetch(SUBGRAPH_URL, {
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
      throw new Error('Failed to fetch tokens with liquidity');
    }
    
    const tokens = result.data.tokenCreateds.map((token: any) => ({
      id: token.id,
      address: token.id,
      name: token.name,
      symbol: token.symbol,
      creatorAddress: token.creator.id,
      createdAt: token.blockTimestamp,
      updatedAt: token.blockTimestamp,
      migrated: token.pool.migrated,
      liquidityEvents: [{
        id: token.pool.migration.id,
        ethAmount: token.pool.migration.amount0 < token.pool.migration.amount1 ? token.pool.migration.amount0 : token.pool.migration.amount1,
        tokenAmount: token.pool.migration.amount0 > token.pool.migration.amount1 ? token.pool.migration.amount0 : token.pool.migration.amount1,
        timestamp: token.pool.migration.timestamp
      }]
    }));

    return {
      data: tokens,
      totalCount: tokens.length,
      currentPage: page,
      totalPages: Math.ceil(tokens.length / pageSize),
      tokens: []
    };
  } catch (error) {
    console.error('Error fetching tokens with liquidity:', error);
    throw error;
  }
}

export async function getTokenByAddress(address: string): Promise<Token> {
  address = address.toLowerCase();
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
    const response = await fetch(SUBGRAPH_URL, {
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
  const skip = (page - 1) * pageSize;

  const query = `
    query GetLiquidityEvents($tokenId: String!, $first: Int!, $skip: Int!) {
      migrations(where: {token: $tokenId}) {
        amount0
        amount1
        dexPool
        id
      }
    }
  `;

  const variables = {
    tokenId,
    first: pageSize,
    skip: skip
  };

  try {
    const response = await fetch(SUBGRAPH_URL, {
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
      console.error('GraphQL errors:', result.errors);
      return {
        data: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 0,
        tokens: []
      };
    }

    const events = result.data.migrations.map((event: any) => ({
      id: event.id,
      ethAmount: event.amount0 < event.amount1 ? event.amount0 : event.amount1,
      tokenAmount: event.amount0 > event.amount1 ? event.amount0 : event.amount1,
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
  const skip = (transactionPage - 1) * transactionPageSize;
  console.log("getTokenInfoAndTransactions")
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
        creator{id}
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
        token{id}
        ethAmount
        tokenAmount
        tokenPrice
        txHash
        timestamp
        pool{id}
        tax
      }
    }
  `;
  console.log("start fetching token info and transactions")
  try {
    const checksumAddress = ethers.utils.getAddress(address);
    console.log("url", `${API_BASE_URL}/api/tokens/address/${checksumAddress}`)
    // 2. Parallel requests to both APIs
    const [graphqlResponse, metadataResponse] = await Promise.all([
      // Get blockchain data from subgraph
      fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { address: address.toLowerCase(), first: transactionPageSize, skip }
        }),
      }),
      
      // Get metadata from your backend
      fetch(`${API_BASE_URL}/api/tokens/address/${checksumAddress}`)  // Using rewrite to backend
    ]);
    console.log("metadataResponse", metadataResponse)
    const [{ data }, metadata] = await Promise.all([
      graphqlResponse.json(),
      metadataResponse.json()
    ]);
    console.log("token metadata", metadata)
    if (!data.tokenCreated) {
      throw new Error('Token not found');
    }
    console.log("here")
    // 3. Combine the data
    return {
      id: data.tokenCreated.id,
      address: data.tokenCreated.id,
      name: data.tokenCreated.name,
      symbol: data.tokenCreated.symbol,
      creatorAddress: data.tokenCreated.creator.id, 
      logo: metadata && metadata.token && metadata.token.logo ? metadata.token.logo : '',        // From backend
      description: metadata && metadata.token && metadata.token.description ? metadata.token.description : '', // From backend
      createdAt: data.tokenCreated.blockTimestamp,
      updatedAt: data.tokenCreated.blockTimestamp,
      _count: { liquidityEvents: 0 },
      youtube: metadata && metadata.token && metadata.token.socialLinks && metadata.token.socialLinks.youtube ? metadata.token.socialLinks.youtube : "",
      discord: metadata && metadata.token && metadata.token.socialLinks && metadata.token.socialLinks.discord ? metadata.token.socialLinks.discord : "",
      twitter: metadata && metadata.token && metadata.token.socialLinks && metadata.token.socialLinks.twitter ? metadata.token.socialLinks.twitter : "",
      website: metadata && metadata.token && metadata.token.socialLinks && metadata.token.socialLinks.website ? metadata.token.socialLinks.website : "",
      telegram: metadata && metadata.token && metadata.token.socialLinks && metadata.token.socialLinks.telegram ? metadata.token.socialLinks.telegram : "",
      transactions: {
        data: data.transactions.map((tx: any) => ({
          id: tx.id,
          type: tx.type,
          senderAddress: tx.senderAddress,
          recipientAddress: tx.token.id,
          ethAmount: tx.ethAmount,
          tokenAmount: tx.tokenAmount,
          tokenPrice: tx.tokenPrice,
          txHash: tx.txHash,
          timestamp: tx.timestamp,
          poolAddress: tx.pool,
          tax: tx.tax
        })),
        pagination: {
          currentPage: transactionPage,
          pageSize: transactionPageSize,
          totalCount: data.transactions.length,
          totalPages: Math.ceil(data.transactions.length / transactionPageSize)
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
  const query = `
    query GetHistoricalPrices($address: String!) {
      transactions(
        where: { token: $address }
        orderBy: timestamp
        orderDirection: asc
      ) {
        id
        tokenPrice
        timestamp
      }
    }
  `;

  const variables = {
    address: address.toLowerCase()
  };

  try {
    const response = await fetch(SUBGRAPH_URL, {
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
      throw new Error('Failed to fetch historical prices');
    }

    return result.data.transactions.map((tx: any) => ({
      tokenPrice: tx.tokenPrice,
      timestamp: new Date(parseInt(tx.timestamp) * 1000).toISOString()
    }));
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    throw error;
  }
}

let lastPrice = '0';
let lastFetch = 0;
const CACHE_DURATION = 60000; // 1 minute in milliseconds

export async function getCurrentPrice(): Promise<string> {
  // Return cached price if it's less than 1 minute old
  if (lastPrice && Date.now() - lastFetch < CACHE_DURATION) {
    return lastPrice;
  }

  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=rootstock&vs_currencies=usd'
    );
    
    if (response.data.rootstock?.usd) {
      lastPrice = response.data.rootstock.usd.toString();
      lastFetch = Date.now();
      return lastPrice;
    }
    
    throw new Error('rBTC price not found');
  } catch (error) {
    console.error('Error fetching rBTC price:', error);
    throw error;
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
    // const response = await axios.patch(`/api/tokens/update/${address}`, data);
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
  const skip = (page - 1) * pageSize;

  const query = `
    query GetUserTransactions($address: String!, $first: Int!, $skip: Int!) {
      user(id: $address) {
        transactions(
          first: $first
          skip: $skip
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          type
          senderAddress
          token{id}
          ethAmount
          tokenAmount
          tokenPrice
          txHash
          timestamp
          pool { id }
          tax
          token { 
            id
            symbol 
            name
          }
        }
      }
    }
  `;

  const variables = {
    address: address.toLowerCase(),
    first: pageSize,
    skip: skip
  };

  try {
    const response = await fetch(SUBGRAPH_URL, {
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
      throw new Error('Failed to fetch transactions');
    }

    const transactions = result.data.user?.transactions || [];

    return {
      transactions: transactions.map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        senderAddress: tx.senderAddress,
        recipientAddress: tx.token.id,
        ethAmount: tx.ethAmount,
        tokenAmount: tx.tokenAmount,
        tokenPrice: tx.tokenPrice,
        txHash: tx.txHash,
        timestamp: tx.timestamp,
        poolAddress: tx.pool?.id,
        tax: tx.tax
      })),
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalCount: transactions.length,
        totalPages: Math.ceil(transactions.length / pageSize)
      }
    };
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
  const query = `
    query GetAllTokenAddresses {
      tokenCreateds {
        id
        symbol
      }
    }
  `;

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error('Failed to fetch token addresses');
    }

    return result.data.tokenCreateds.map((token: any) => ({
      address: token.id,
      symbol: token.symbol
    }));
  } catch (error) {
    console.error('Error fetching token addresses and symbols:', error);
    throw error;
  }
}

export async function getTokensByCreator(
  creatorAddress: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<Token>> {
  const skip = (page - 1) * pageSize;

  const query = `
    query GetTokensByCreator($creator: String!, $first: Int!, $skip: Int!) {
      tokenCreateds(
        where: {creator_: {id: $creator}}
        first: $first
        skip: $skip
        orderBy: blockTimestamp
        orderDirection: desc
      ) {
        id
        name
        symbol
        blockTimestamp
        creator { id }
      }
    }
  `;

  const variables = {
    creator: creatorAddress.toLowerCase(),
    first: pageSize,
    skip: skip
  };

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error('Failed to fetch tokens by creator');
    }

    const tokens = result.data.tokenCreateds.map((token: any) => ({
      id: token.id,
      address: token.id,
      name: token.name,
      symbol: token.symbol,
      creatorAddress: token.creator.id,
      createdAt: new Date(parseInt(token.blockTimestamp) * 1000).toISOString(),
      updatedAt: new Date(parseInt(token.blockTimestamp) * 1000).toISOString(),
      _count: { liquidityEvents: 0 }
    }));

    return {
      data: tokens,
      totalCount: tokens.length,
      currentPage: page,
      totalPages: Math.ceil(tokens.length / pageSize),
      tokens: []
    };
  } catch (error) {
    console.error('Error fetching tokens by creator:', error);
    throw error;
  }
}


//blockexplorer Get token Holders
export async function getTokenHolders(tokenAddress: string): Promise<TokenHolder[]> {
  try {
    // const blockExplorerUrl = 'https://rootstock-testnet.blockscout.com'; // testnet
    const blockExplorerUrl = 'https://rootstock.blockscout.com'; // mainnet
    const response = await axios.get(
      `${blockExplorerUrl}/api`, {
        params: {
          module: 'token',
          action: 'getTokenHolders',
          contractaddress: tokenAddress,
          // Add these parameters as per Blockscout docs
          page: 1,
          offset: 100
        }
      }
    );


    if (response.data.status !== '1') {
      console.error('API Error:', response.data.message);
      throw new Error(response.data.message || 'Failed to fetch token holders');
    }

    const holders = response.data.result.map((item: any) => ({
      address: item.address,
      balance: item.value
    }));

    return holders;
  } catch (error) {
    console.error('Error fetching token holders:', error);
    throw error;
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
    const response = await fetch(SUBGRAPH_URL, {
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

