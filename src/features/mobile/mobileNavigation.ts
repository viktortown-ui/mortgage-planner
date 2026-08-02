export type MobileTab = 'overview' | 'input' | 'charts' | 'scenarios' | 'table';

export function resolveMobileTab(selectedTab: MobileTab, calculationIsReady: boolean): MobileTab {
  return calculationIsReady ? selectedTab : 'input';
}
