
export interface GSCData {
  date: string;
  url: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SummaryStats {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
}

export interface PageStats {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
}

export interface QueryStats {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
}

export interface BQConfig {
  projectId: string;
  datasetId: string;
  tableId: string;
  location: string;
  clientId: string;
}

export type ViewType = 'overview' | 'pageDetail' | 'queryDetail' | 'settings';

export interface AppState {
  view: ViewType;
  selectedUrl?: string;
  selectedQuery?: string;
  startDate: string;
  endDate: string;
  config: BQConfig;
  token?: string;
}
