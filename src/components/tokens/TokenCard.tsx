import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CurrencyDollarIcon,
  UserIcon,
  ClockIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { Token, TokenWithLiquidityEvents } from "@/interface/types";
import {
  useTokenLiquidity,
  formatAmount,
  formatTimestamp,
  formatAmountV2,
} from "@/utils/blockchainUtils";
import Spinner from "@/components/ui/Spinner";
import { useRouter } from "next/router";

interface TokenCardProps {
  token: Token | TokenWithLiquidityEvents;
  isEnded: boolean;
}

const TokenCard: React.FC<TokenCardProps> = ({ token, isEnded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [currentLiquidity, setCurrentLiquidity] = useState<string>("0");
  const tokenAddress = token.address as `0x${string}`;
  const { data: liquidityData } = useTokenLiquidity(tokenAddress);

  useEffect(() => {
    if (liquidityData && liquidityData[2]) {
      setCurrentLiquidity(liquidityData[2].toString());
    }
  }, [liquidityData]);

  const isTokenWithLiquidity = (
    token: Token | TokenWithLiquidityEvents
  ): token is TokenWithLiquidityEvents => {
    return "liquidityEvents" in token && token.liquidityEvents.length > 0;
  };

  const handleClick = () => {
    setIsLoading(true);
  };

  const handleViewCharts = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsLoading(true);
    router.push(`/token/${token.address}`);
  };

  const handleProfileClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/profile/${token.creatorAddress}`);
  };

  if (isEnded && isTokenWithLiquidity(token)) {
    const liquidityEvent = token.liquidityEvents[0];
    const uniswapLink = `https://chewyswap.dog/swap/?outputCurrency=${token.address}&chain=shibarium`;

    return (
      <div className="w-full max-w-sm p-4 bg-[#3F3F5D] rounded-lg shadow-xl relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-10 rounded-lg">
            <Spinner size="medium" />
          </div>
        )}
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-gray-700 rounded-md flex items-center justify-center w-16 h-16">
            <img
              src={token.logo}
              alt={`${token.name} Logo`}
              width={64}
              height={64}
              className="object-cover rounded-md"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{token.name}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <TagIcon className="h-4 w-4" />
              <span>Listed on Chewswap</span>
            </div>
          </div>
        </div>
        <div className="grid gap-2 mb-4 text-[10px] sm:text-xs">
          <div className="flex items-center justify-center text-[#B3AEAE]">
            <span>Initial Liquidity Added</span>
          </div>
          <div className="flex items-center justify-between text-white">
            <span>{token.symbol}</span>
            <span>{formatAmountV2(liquidityEvent.tokenAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-white">
            <span>BONE</span>
            <span>{formatAmountV2(liquidityEvent.ethAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-400">
            <span>Listed</span>
            <span>{formatTimestamp(liquidityEvent.timestamp)}</span>
          </div>
          <div className="flex items-center justify-between text-white">
            {/* <span>Current Liquidity</span>
            <span>{formatAmount(currentLiquidity)}</span> */}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={uniswapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 text-center whitespace-nowrap"
          >
            Chewyswap
          </a>
          <a
            href={`/token/${token.address}`}
            onClick={handleViewCharts}
            className="px-2 py-1 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-medium bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 text-center whitespace-nowrap"
          >
            View Charts
          </a>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/token/${token.address}`} passHref>
      <div
        onClick={handleClick}
        className="w-full bg-[#3F3F5D] rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer relative"
      >
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-10">
            <Spinner size="medium" />
          </div>
        )}
        <div className="h-40 sm:h-48 overflow-hidden p-4">
          <img
            src={token.logo}
            alt={token.name}
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {/* <div className="bg-gray-700 rounded-md flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 overflow-hidden">
    <img src={token.logo} alt={token.name} className="w-full h-full object-cover" />
  </div> */}
            <div className="flex items-center space-x-1">
              <h3 className="text-sm sm:text-base font-semibold text-[#F7931A] mb-0">
                {token.name}
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-400 bg-[#1B1B28] px-2 py-1 rounded-md">
                {token.symbol}
              </p>
            </div>
          </div>
          <div className="grid gap-2 text-[10px] sm:text-xs">
            <div className="flex items-center text-[#F9F9F9]">
              <CurrencyDollarIcon className="h-4 w-4 mr-2" />
              <span className="flex items-center">
                Market cap:{"\u00A0"}
                <br />
                {/* <Image
                  src="/logo/wbone.png"
                  alt="BONE"
                  width={16}
                  height={16}
                  className="inline-block align-middle mr-1"
                /> */}
                {formatAmountV2(currentLiquidity)}
              </span>
            </div>
            <div className="flex items-center text-gray-400">
              <UserIcon className="h-4 w-4 mr-2" />
              <span className="text-[#B3AEAE]">
                Deployed by:{" "}
                <span
                  className="text-[#F9F9F9] hover:underline cursor-pointer"
                  onClick={handleProfileClick}
                >
                  {token.creatorAddress
                    ? `${token.creatorAddress.slice(-6)}`
                    : "Unknown"}
                </span>
              </span>
            </div>
            <div className="flex items-center text-gray-400">
              <ClockIcon className="h-4 w-4 mr-2" />
              <span className="text-[#B3AEAE]">
                Created: {formatTimestamp(token.createdAt)}
              </span>
            </div>
            <div className="w-full bg-[#1B1B28] rounded-md">
              <div
                className="bg-[#5252FF] text-xs font-medium text-[#F9F9F9] text-start p-2 leading-none rounded-md flex justify-between"
                style={{ width: "45%" }}
              >
                {" "}
                <div>45%</div>
                {/* <div>Launched !</div> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default TokenCard;
