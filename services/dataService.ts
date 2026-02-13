
import { SummaryStats, PageStats, QueryStats, BQConfig } from '../types';

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
        // Sayısal değerleri dönüştür
        if (['clicks', 'impressions', 'avgPosition', 'ctr', 'totalClicks', 'totalImpressions', 'avgCtr'].includes(fieldName)) {
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

  static async getUrlDetails(config: BQConfig, token: string, url: string, start: string, end: string): Promise<QueryStats[]> {
    const tablePath = `\`${config.projectId}.${config.datasetId}.${config.tableId}\``;
    const sql = `
      SELECT query, SUM(clicks) as clicks, SUM(impressions) as impressions, AVG(sum_position / impressions) as avgPosition, (SUM(clicks) / SUM(impressions)) * 100 as ctr
      FROM ${tablePath}
      WHERE url = '${url}' AND data_date BETWEEN '${start}' AND '${end}'
      GROUP BY query ORDER BY clicks DESC LIMIT 100
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
