
import { SummaryStats, PageStats, QueryStats, BQConfig, ComparisonItem, MetricSet } from '../types';

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
        if (value !== null && !isNaN(Number(value)) && fieldName !== 'key' && fieldName !== 'url' && fieldName !== 'query') {
          value = parseFloat(value);
        }
        obj[fieldName] = value;
      });
      return obj;
    });
  }

  static async getOverview(config: BQConfig, token: string, start: string, end: string): Promise<SummaryStats> {
    const tablePath = `\`${config.projectId}.${config.datasetId}.${config.tableId}\``;
    
    // Calculate dates
    const sDate = new Date(start);
    const eDate = new Date(end);
    const diff = Math.ceil(Math.abs(eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const prevEnd = new Date(sDate);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (diff - 1));

    const prevYearStart = new Date(sDate);
    prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
    const prevYearEnd = new Date(eDate);
    prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);

    const format = (d: Date) => d.toISOString().split('T')[0];

    const sql = `
      WITH periods AS (
        SELECT 'current' as p, clicks, impressions, sum_position FROM ${tablePath} WHERE data_date BETWEEN '${start}' AND '${end}'
        UNION ALL
        SELECT 'previous' as p, clicks, impressions, sum_position FROM ${tablePath} WHERE data_date BETWEEN '${format(prevStart)}' AND '${format(prevEnd)}'
        UNION ALL
        SELECT 'prevYear' as p, clicks, impressions, sum_position FROM ${tablePath} WHERE data_date BETWEEN '${format(prevYearStart)}' AND '${format(prevYearEnd)}'
      )
      SELECT 
        p, 
        SUM(clicks) as clicks, 
        SUM(impressions) as impressions, 
        (SUM(clicks) / NULLIF(SUM(impressions), 0)) * 100 as ctr,
        AVG(sum_position / NULLIF(impressions, 0)) as avgPosition
      FROM periods
      GROUP BY p
    `;

    const rows = await this.executeQuery(config, token, sql);
    const getP = (p: string): MetricSet => {
      const r = rows.find(x => x.p === p) || { clicks: 0, impressions: 0, ctr: 0, avgPosition: 0 };
      return {
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        avgPosition: r.avgPosition || 0
      };
    };

    return {
      current: getP('current'),
      previous: getP('previous'),
      prevYear: getP('prevYear')
    };
  }

  static async getTopEntities(config: BQConfig, token: string, type: 'url' | 'query', start: string, end: string, sortCol: string = 'clicks', sortDir: 'ASC' | 'DESC' = 'DESC', limit: number = 100): Promise<any[]> {
    const tablePath = `\`${config.projectId}.${config.datasetId}.${config.tableId}\``;
    const groupBy = type === 'url' ? 'url' : 'query';
    const sql = `
      SELECT ${groupBy}, SUM(clicks) as clicks, SUM(impressions) as impressions, (SUM(clicks) / NULLIF(SUM(impressions), 0)) * 100 as ctr, AVG(sum_position / NULLIF(impressions, 0)) as avgPosition
      FROM ${tablePath}
      WHERE data_date BETWEEN '${start}' AND '${end}'
      GROUP BY ${groupBy}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ${limit}
    `;
    return this.executeQuery(config, token, sql);
  }

  static async getComparisonData(config: BQConfig, token: string, type: 'url' | 'query', activeStart: string, activeEnd: string, prevStart: string, prevEnd: string): Promise<ComparisonItem[]> {
    const tablePath = `\`${config.projectId}.${config.datasetId}.${config.tableId}\``;
    const groupBy = type === 'url' ? 'url' : 'query';
    
    const sql = `
      WITH current_period AS (
        SELECT ${groupBy} as key, SUM(clicks) as clicks, SUM(impressions) as impressions, AVG(sum_position / NULLIF(impressions, 0)) as avgPosition
        FROM ${tablePath}
        WHERE data_date BETWEEN '${activeStart}' AND '${activeEnd}'
        GROUP BY ${groupBy}
      ),
      previous_period AS (
        SELECT ${groupBy} as key, SUM(clicks) as clicks, SUM(impressions) as impressions, AVG(sum_position / NULLIF(impressions, 0)) as avgPosition
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
      SELECT query, SUM(clicks) as clicks, SUM(impressions) as impressions, AVG(sum_position / NULLIF(impressions, 0)) as avgPosition, (SUM(clicks) / NULLIF(SUM(impressions), 0)) * 100 as ctr
      FROM ${tablePath}
      WHERE url = '${url}' AND data_date BETWEEN '${start}' AND '${end}'
      GROUP BY query ORDER BY ${sortCol} ${sortDir} LIMIT 100
    `;
    return this.executeQuery(config, token, sql);
  }

  static async getQueryDetails(config: BQConfig, token: string, query: string, start: string, end: string, sortCol: string = 'clicks', sortDir: 'ASC' | 'DESC' = 'DESC'): Promise<PageStats[]> {
    const tablePath = `\`${config.projectId}.${config.datasetId}.${config.tableId}\``;
    const sql = `
      SELECT url, SUM(clicks) as clicks, SUM(impressions) as impressions, AVG(sum_position / NULLIF(impressions, 0)) as avgPosition, (SUM(clicks) / NULLIF(SUM(impressions), 0)) * 100 as ctr
      FROM ${tablePath}
      WHERE query = '${query}' AND data_date BETWEEN '${start}' AND '${end}'
      GROUP BY url ORDER BY ${sortCol} ${sortDir} LIMIT 100
    `;
    return this.executeQuery(config, token, sql);
  }
}
