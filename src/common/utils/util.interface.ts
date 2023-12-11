export interface PropDataInput {
  [props: string]: any;
}

export interface ErrorResponseI {
  readonly message: string;
  readonly status: number;
  readonly location?: string; // the name of the function where the error occured or any tracable desc
}

export interface SuccessResponseI {
  readonly message: string;
  readonly status: number;
  readonly data?: object;
}
