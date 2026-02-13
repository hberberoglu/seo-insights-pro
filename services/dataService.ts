
import { GSCData, SummaryStats, PageStats, QueryStats } from '../types';

// In a real application, these functions would call a backend API that executes SQL on BigQuery.
// Example BigQuery SQL for 'overview':
// SELECT page, query, SUM(clicks), SUM(impressions), AVG(position) 
// FROM `your-project.searchconsole.searchdata_url_impression`
// WHERE data_date BETWEEN @start AND @end 
// GROUP BY 1, 2

const MOCK_URLS = [
  'https://mysite.com/blog/seo-guide',
  'https://mysite.com/products/widget-a',
  'https://mysite.com/blog/how-to-use-bigquery',
  'https://mysite.com/about',
  'https://mysite.com/contact',
  'https://mysite.com/services/consulting'
];

const MOCK_QUERIES = [
  'seo tools',
  'bigquery tutorial',
  'google search console data',
  'best widgets 2024',
  'how to analyze seo',
  'bigquery search console export',
  'content marketing strategy'
];

export const generateMockData = (count: number = 100): GSCData[] => {
  return Array.from({ length: count }).map((_, i) => {
    const clicks = Math.floor(Math.random() * 500);
    const impressions = clicks + Math.floor(Math.random() * 5000);
    return {
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      url: MOCK_URLS[Math.floor(Math.random() * MOCK_URLS.length)],
      query: MOCK_QUERIES[Math.floor(Math.random() * MOCK_QUERIES.length)],
      clicks,
      impressions,
      ctr: (clicks / (impressions || 1)) * 100,
      position: parseFloat((Math.random() * 20 + 1).toFixed(1)),
    };
  });
};

export class DataService {
  private static allData: GSCData[] = generateMockData(500);

  // Updated return type to use PageStats and QueryStats
  static async getOverview(start: string, end: string): Promise<{
    pages: PageStats[],
    queries: QueryStats[],
    summary: SummaryStats
  }> {
    const filtered = this.allData.filter(d => d.date >= start && d.date <= end);
    
    // Aggregate by Page
    const pageMap = new Map();
    filtered.forEach(d => {
      const existing = pageMap.get(d.url) || { clicks: 0, impressions: 0, posSum: 0, count: 0 };
      pageMap.set(d.url, {
        clicks: existing.clicks + d.clicks,
        impressions: existing.impressions + d.impressions,
        posSum: existing.posSum + d.position,
        count: existing.count + 1
      });
    });

    // Aggregate by Query
    const queryMap = new Map();
    filtered.forEach(d => {
      const existing = queryMap.get(d.query) || { clicks: 0, impressions: 0, posSum: 0, count: 0 };
      queryMap.set(d.query, {
        clicks: existing.clicks + d.clicks,
        impressions: existing.impressions + d.impressions,
        posSum: existing.posSum + d.position,
        count: existing.count + 1
      });
    });

    const pages: PageStats[] = Array.from(pageMap.entries()).map(([url, stats]) => ({
      url,
      ...stats,
      ctr: (stats.clicks / stats.impressions) * 100,
      avgPosition: stats.posSum / stats.count
    })).sort((a, b) => b.clicks - a.clicks);

    const queries: QueryStats[] = Array.from(queryMap.entries()).map(([query, stats]) => ({
      query,
      ...stats,
      ctr: (stats.clicks / stats.impressions) * 100,
      avgPosition: stats.posSum / stats.count
    })).sort((a, b) => b.clicks - a.clicks);

    const summary: SummaryStats = {
      totalClicks: filtered.reduce((acc, d) => acc + d.clicks, 0),
      totalImpressions: filtered.reduce((acc, d) => acc + d.impressions, 0),
      avgCtr: (filtered.reduce((acc, d) => acc + d.clicks, 0) / filtered.reduce((acc, d) => acc + d.impressions, 1)) * 100,
      avgPosition: filtered.reduce((acc, d) => acc + d.position, 0) / (filtered.length || 1)
    };

    return { pages, queries, summary };
  }

  // Updated return type to QueryStats[]
  static async getUrlDetails(url: string, start: string, end: string): Promise<QueryStats[]> {
    const filtered = this.allData.filter(d => d.url === url && d.date >= start && d.date <= end);
    const queryMap = new Map();
    filtered.forEach(d => {
      const existing = queryMap.get(d.query) || { clicks: 0, impressions: 0, posSum: 0, count: 0 };
      queryMap.set(d.query, {
        clicks: existing.clicks + d.clicks,
        impressions: existing.impressions + d.impressions,
        posSum: existing.posSum + d.position,
        count: existing.count + 1
      });
    });

    return Array.from(queryMap.entries()).map(([query, stats]) => ({
      query,
      ...stats,
      ctr: (stats.clicks / stats.impressions) * 100,
      avgPosition: stats.posSum / stats.count
    })).sort((a, b) => b.clicks - a.clicks);
  }

  // Updated return type to PageStats[]
  static async getQueryDetails(query: string, start: string, end: string): Promise<PageStats[]> {
    const filtered = this.allData.filter(d => d.query === query && d.date >= start && d.date <= end);
    const urlMap = new Map();
    filtered.forEach(d => {
      const existing = urlMap.get(d.url) || { clicks: 0, impressions: 0, posSum: 0, count: 0 };
      urlMap.set(d.url, {
        clicks: existing.clicks + d.clicks,
        impressions: existing.impressions + d.impressions,
        posSum: existing.posSum + d.position,
        count: existing.count + 1
      });
    });

    return Array.from(urlMap.entries()).map(([url, stats]) => ({
      url,
      ...stats,
      ctr: (stats.clicks / stats.impressions) * 100,
      avgPosition: stats.posSum / stats.count
    })).sort((a, b) => b.clicks - a.clicks);
  }
}
