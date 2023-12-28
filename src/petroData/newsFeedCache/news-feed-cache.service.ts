import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NewsFeedCachingService {
  private newsFeedCache: Record<string, { data: any; timestamp: number }> = {};
  private readonly MAX_CACHE_VALIDITY_PERIOD = 6 * 60 * 60 * 1000; // 6 hours

  /* Method to return the cache data for checks and comparisons before making a request */
  get(key: string, validityPeriod: number = 0): any | undefined {
    const cachedData = this.newsFeedCache[key];

    if (
      cachedData &&
      (!validityPeriod || Date.now() - cachedData.timestamp < validityPeriod)
    ) {
      return cachedData.data;
    } else {
      return undefined;
    }
  }

  /* Method to set the cache key and value after making a request */
  set(key: string, value: any): void {
    this.newsFeedCache[key] = { data: value, timestamp: Date.now() };
  }

  /* Job that runs every 6 hours to clear the news feed cache */
  @Cron(CronExpression.EVERY_6_HOURS)
  clearNewsFeedCache() {
    const currentTime = Date.now();
    Object.keys(this.newsFeedCache).forEach((key) => {
      const cachedItem = this.newsFeedCache[key];
      if (
        currentTime - cachedItem.timestamp >=
        this.MAX_CACHE_VALIDITY_PERIOD
      ) {
        delete this.newsFeedCache[key];
      }
    });
  }

  //   /* Method to clear the cache manually */
  //   clearCache(): void {
  //     this.newsFeedCache = {};
  //   }

  //   /* method to get the entire cache for inspection */
  //   getCache(): Record<string, { data: any; timestamp: number }> {
  //     return this.newsFeedCache;
  //   }
}
