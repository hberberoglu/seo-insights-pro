
export interface GSCData {
  date: string;
  url: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface MetricSet {
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
}

export interface SummaryStats {
  current: MetricSet;
  previous: MetricSet;
  prevYear: MetricSet;
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

export interface ComparisonItem {
  key: string; // can be url or query
  clicks: number;
  impressions: number;
  avgPosition: number;
  prevClicks: number;
  prevImpressions: number;
  prevAvgPosition: number;
  clickDelta: number;
  positionDelta: number;
  ctr: number;
}

export interface BQConfig {
  projectId: string;
  datasetId: string;
  tableId: string;
  location: string;
  clientId: string;
  aiLanguage: 'en' | 'tr';
}

export type ViewType = 'overview' | 'pageDetail' | 'queryDetail' | 'settings' | 'comparison' | 'comparisonDetail';

export interface AppState {
  view: ViewType;
  selectedUrl?: string;
  selectedQuery?: string;
  comparisonDetail?: {
    type: 'url' | 'query';
    metric: 'clicks' | 'position';
    trend: 'rising' | 'falling';
  };
  startDate: string;
  endDate: string;
  config: BQConfig;
  token?: string;
}
