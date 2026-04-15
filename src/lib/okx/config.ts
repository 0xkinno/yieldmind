export const OKX_WEB3_BASE =
  process.env.OKX_WEB3_BASE?.replace(/\/$/, "") ?? "https://web3.okx.com";

/** OKX Wallet API chainIndex for X Layer mainnet */
export const X_LAYER_CHAIN_INDEX = "196";

/** Native gas token representation for OKX DEX market APIs on EVM chains */
export const EVM_NATIVE_PLACEHOLDER =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

/** Native USDC on X Layer (per OKX / xlayer-tokenlist) */
export const X_LAYER_USDC =
  "0x74b7F16337b8972027F6196A17a631aC6dE26d22";
