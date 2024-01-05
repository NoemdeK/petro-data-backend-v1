import { Injectable } from '@nestjs/common';

@Injectable()
export class DataEntryUtility {
  constructor() {}

  /**
   * @Responsibility: dedicated function for pagination
   *
   * @returns {number}
   */

  paginationFunc(batch: number, limit: number): number {
    const theBatch = batch ?? 1;
    const theLimit = limit ?? 10;
    return Math.max(0, +(theBatch - 1) * theLimit);
  }

  /**
   * @Responsibility: dedicated function for custom formatting of date
   *
   * @returns {string}
   */

  customDateFormat(dateObj: Date): string {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const formattedDate = `${dateObj.getFullYear()}-${
      months[dateObj.getMonth()]
    }-${('0' + dateObj.getDate()).slice(-2)}`;
    return formattedDate;
  }
}
