export default class CustomApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'CustomApiError';
    this.status = status;
    this.data = data;
    this.isConflict = status === 409 && data?.details?.canResend;
  }
}
