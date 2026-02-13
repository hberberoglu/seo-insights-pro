
import { SummaryStats, PageStats, QueryStats, BQConfig, ComparisonItem } from '../types';

export class DataService {
  private static async executeQuery(config: BQConfig, token: string, sql: string) {
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${config.projectId}/queries`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: sql,
        useLegacySql: false,
        location: config.location
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'BigQuery sorgusu başarısız oldu.');
    }

    const result = await response.json();
    return this.formatRows(result);
  }

  private static formatRows(bqResult: any): any[] {
    if (!bqResult.rows) return [];
    const fields = bqResult.schema.fields.map((f: any) => f.name);
    return bqResult.rows.map((row: any) => {
      const obj: any = {};
      row.f.forEach((val: any, i: number) => {
        const fieldName = fields[i];
        let value = val.v;
        if (['clicks', 'impressions', 'avgPosition', 'ctr', 'totalClicks', 'totalImpressions', 'avgCtr', 'prevClicks', 'prevImpressions', 'prevAvgPosition', 'clickDelta', 'positionDelta'].includes(fieldName)) {
          value = parseFloat(value);
        }
        obj[fieldName] = value;
      });
      return obj;
    });
  }

  static async getOverview(config: BQConfig, token: string, start: string, end: string) {
    const tablePath = `\`${config.projectId}.${config.datasetId}.${config.tableId}\``;
    
    const pageSql = `
      SELECT url, SUM(clicks) as clicks, SUM(impressions) as impressions, AVG(sum_position / impressions) as avgPosition
      FROM ${tablePath}
      WHERE data_date BETWEEN '${start}' AND '${end}'
      GROUP BY url ORDER BY clicks DESC LIMIT 50
    `;

    const querySql = `
      SELECT query, SUM(clicks) as clicks, SUM(impressions) as impressions, AVG(sum_position / impressions) as avgPosition, (SUM(clicks) / SUM(impressions)) * 100 as ctr
      FROM ${tablePath}
      WHERE data_date BETWEEN '${start}' AND '${end}'
      GROUP BY query ORDER BY clicks DESC LIMIT 50
    `;

    const summarySql = `
      SELECT SUM(clicks) as totalClicks, SUM(impressions) as totalImpressions, (SUM(clicks) / SUM(impressions)) * 100 as avgCtr, AVG(sum_position / impressions) as avgPosition
      FROM ${tablePath}
      WHERE data_date BETWEEN '${start}' AND '${end}'
    `;

    const [pages, queries, summaryRows] = await Promise.all([
      this.executeQuery(config, token, pageSql),
      this.executeQuery(config, token, querySql),
      this.executeQuery(config, token, summarySql)
    ]);

    return {
      pages: pages as PageStats[],
      queries: queries as QueryStats[],
      summary: summaryRows[0] as SummaryStats
    };
  }

  static async getComparisonData(config: BQConfig, token: string, type: 'url' | 'query', activeStart: string, activeEnd: string, prevStart: string, prevEnd: string): Promise<ComparisonItem[]> {
    const tablePath = `\`${config.projectId}.${config.datasetId}.${config.tableId}\``;
    const groupBy = type === 'url' ? 'url' : 'query';
    
    const sql = `
      WITH current_period AS (
        SELECT ${groupBy} as key, SUM(clicks) as clicks, SUM(impressions) as impressions, AVG(sum_position / impressions) as avgPosition
        FROM ${tablePath}
        WHERE data_date BETWEEN '${activeStart}' AND '${activeEnd}'
        GROUP BY ${groupBy}
      ),
      previous_period AS (
        SELECT ${groupBy} as key, SUM(clicks) as clicks, SUM(impressions) as impressions, AVG(sum_position / impressions) as avgPosition
        FROM ${tablePath}
        WHERE data_date BETWEEN '${prevStart}' AND '${prevEnd}'
        GROUP BY ${groupBy}
      )
      SELECT 
        COALESCE(c.key, p.key) as key,
        COALESCE(c.clicks, 0) as clicks,
        COALESCE(c.impressions, 0) as impressions,
        COALESCE(c.avgPosition, 0) as avgPosition,
        COALESCE(p.clicks, 0) as prevClicks,
        COALESCE(p.impressions, 0) as prevImpressions,
        COALESCE(p.avgPosition, 0) as prevAvgPosition,
        (COALESCE(c.clicks, 0) - COALESCE(p.clicks, 0)) as clickDelta,
        (COALESCE(c.avgPosition, 0) - COALESCE(p.avgPosition, 0)) as positionDelta
      FROM current_period c
      FULL OUTER JOIN previous_period p ON c.key = p.key
      WHERE COALESCE(c.clicks, 0) > 3 OR COALESCE(p.clicks, 0) > 3
      LIMIT 2000
    `;

    const rows = await this.executeQuery(config, token, sql);
    return rows.map(row => ({
      ...row,
      ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0
    })) as ComparisonItem[];
  }

  static async getUrlDetails(config: BQConfig, token: string, url: string, start: string, end: string, sortCol: string = 'clicks', sortDir: 'ASC' | 'DESC' = 'DESC'): Promise<QueryStats[]> {
    const tablePath = `\`${config.projectId}.${config.datasetId}.${config.tableId}\``;
    const sql = `
      SELECT query, SUM(clicks) as clicks, SUM(impressions) as impressions, AVG(sum_position / impressions) as avgPosition, (SUM(clicks) / SUM(impressions)) * 100 as ctr
      FROM ${tablePath}
      WHERE url = '${url}' AND data_date BETWEEN '${start}' AND '${end}'
      GROUP BY query ORDER BY ${sortCol} ${sortDir} LIMIT 100
    `;
    return this.executeQuery(config, token, sql);
  }

  static async getQueryDetails(config: BQConfig, token: string, query: string, start: string, end: string): Promise<PageStats[]> {
    const tablePath = `\`${config.projectId}.${config.datasetId}.${config.tableId}\``;
    const sql = `
      SELECT url, SUM(clicks) as clicks, SUM(impressions) as impressions, AVG(sum_position / impressions) as avgPosition, (SUM(clicks) / SUM(impressions)) * 100 as ctr
      FROM ${tablePath}
      WHERE query = '${query}' AND data_date BETWEEN '${start}' AND '${end}'
      GROUP BY url ORDER BY clicks DESC LIMIT 100
    `;
    return this.executeQuery(config, token, sql);
  }
}
