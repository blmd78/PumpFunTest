import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { WagmiConfig, createConfig, WagmiProvider } from 'wagmi'
import { rootstockTestnet, shibarium } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { WebSocketProvider } from '@/components/providers/WebSocketProvider';



const config = getDefaultConfig({
  appName: "likeaser",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? 'YOUR_PROJECT_ID',
  chains: [
    {
      ...rootstockTestnet,
      rpcUrls: {
        default: {
          http: [process.env.NEXT_PUBLIC_ROOTSTOCK_TESTNET_RPC_URL ?? 'https://public-node.testnet.rsk.co'],
        },
        public: {
          http: ["https://public-node.testnet.rsk.co"],
        },
      },
    }
  ],
  ssr: true,
});


const queryClient = new QueryClient()

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <WebSocketProvider>
            <Component {...pageProps} />
          </WebSocketProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
      <ToastContainer />
    </WagmiConfig>
  )
}