import { Injectable } from '@nestjs/common';
import * as moment from 'moment';

@Injectable()
export class UserUtility {
  constructor() {}

  /**
   * @Responsibility: fxn to calculate the user duration
   * @param createdAt
   * @param lastLoggedIn
   * @returns {*}
   */

  calcDuration(createdAt: string, lastLoggedIn: string): string {
    const duration = moment.duration(
      moment(lastLoggedIn).diff(moment(createdAt)),
    );

    const hours = Math.floor(duration.asHours());
    const minutes = Math.floor(duration.asMinutes()) % 60;

    return `${hours} hours ${minutes} mins`;
  }
}
