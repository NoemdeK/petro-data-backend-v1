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

  /**
   * @Responsibility: dedicated function for custom data-entry unique id
   *
   * @returns {string}
   */

  generateUniqueDataEntryCode(): string {
    /* This uses the Fisher-Yates shuffle to generate random 4 digit values */
    let digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }

    const randomFourDigits = digits.slice(0, 4).join('');
    return 'PDA-' + randomFourDigits;
  }
}
