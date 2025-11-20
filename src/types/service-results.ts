export interface BaseResult {
  success: boolean;
  error?: string;
}

export interface DataResult<T> extends BaseResult {
  data?: T;
}

export interface CommandResult extends BaseResult {
  output?: string;
  code?: number;
}
