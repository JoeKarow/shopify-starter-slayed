/**
 * Type declarations for Network Information API
 * https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API
 */

type ConnectionType =
  | 'bluetooth'
  | 'cellular'
  | 'ethernet'
  | 'mixed'
  | 'none'
  | 'other'
  | 'unknown'
  | 'wifi'
  | 'wimax';

type EffectiveConnectionType = '2g' | '3g' | '4g' | 'slow-2g';

interface NetworkInformation extends EventTarget {
  readonly downlink: number;
  readonly downlinkMax: number;
  readonly effectiveType: EffectiveConnectionType;
  readonly rtt: number;
  readonly saveData: boolean;
  readonly type: ConnectionType;
  onchange: ((this: NetworkInformation, ev: Event) => any) | null;
}

interface Navigator {
  readonly connection?: NetworkInformation;
}