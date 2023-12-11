export interface MailData {
  readonly from: string;
  readonly to: string | string[];
  readonly subject: string;
  readonly template?: string;
  readonly html?: string;
  readonly text?: string;
  readonly 'h:X-Mailgun-Variables'?: object | string;
}
