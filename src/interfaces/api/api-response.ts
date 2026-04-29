export class ApiResponse<T> {
  readonly meta: { readonly result: 'SUCCESS' };
  readonly data: T;

  private constructor(data: T) {
    this.meta = { result: 'SUCCESS' };
    this.data = data;
  }

  static success<T>(data: T): ApiResponse<T> {
    return new ApiResponse(data);
  }

  static empty(): ApiResponse<null> {
    return new ApiResponse(null);
  }
}
