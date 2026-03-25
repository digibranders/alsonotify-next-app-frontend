import { describe, it, expect } from 'vitest';
import { ApiError, ValidationError, NetworkError, isAxiosError, getErrorMessage } from './errors';

describe('ApiError', () => {
  it('should create an error with message', () => {
    const error = new ApiError('Something went wrong');
    expect(error.message).toBe('Something went wrong');
    expect(error.name).toBe('ApiError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });

  it('should accept statusCode and response', () => {
    const error = new ApiError('Not found', 404, { detail: 'missing' });
    expect(error.statusCode).toBe(404);
    expect(error.response).toEqual({ detail: 'missing' });
  });

  it('should work with instanceof after setPrototypeOf', () => {
    const error = new ApiError('test');
    expect(error instanceof ApiError).toBe(true);
  });
});

describe('ValidationError', () => {
  it('should create an error with message', () => {
    const error = new ValidationError('Invalid email');
    expect(error.message).toBe('Invalid email');
    expect(error.name).toBe('ValidationError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
  });

  it('should accept a field name', () => {
    const error = new ValidationError('Required', 'email');
    expect(error.field).toBe('email');
  });
});

describe('NetworkError', () => {
  it('should create with default message', () => {
    const error = new NetworkError();
    expect(error.message).toBe('Network request failed');
    expect(error.name).toBe('NetworkError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NetworkError);
  });

  it('should accept a custom message', () => {
    const error = new NetworkError('Connection timeout');
    expect(error.message).toBe('Connection timeout');
  });
});

describe('isAxiosError', () => {
  it('should return true for objects with response and message', () => {
    const error = { response: { status: 400, data: {} }, message: 'Bad Request' };
    expect(isAxiosError(error)).toBe(true);
  });

  it('should return false for plain Error', () => {
    expect(isAxiosError(new Error('test'))).toBe(false);
  });

  it('should return false for null', () => {
    expect(isAxiosError(null)).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isAxiosError('string')).toBe(false);
    expect(isAxiosError(42)).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('should return network error for ApiError without response (isAxiosError matches first)', () => {
    // ApiError extends Error and has 'response' and 'message' properties,
    // so isAxiosError matches it. When response is undefined, it's treated as a network error.
    expect(getErrorMessage(new ApiError('API failed'))).toBe(
      'Unable to connect. Please check your internet connection and try again.'
    );
  });

  it('should return ApiError message when response has no data.message', () => {
    // When response is truthy but has no useful data, falls through to error.message
    const error = new ApiError('API failed', 400, { status: 400 });
    expect(getErrorMessage(error)).toContain('API failed');
  });

  it('should return message from ValidationError', () => {
    expect(getErrorMessage(new ValidationError('Invalid'))).toBe('Invalid');
  });

  it('should return message from NetworkError', () => {
    expect(getErrorMessage(new NetworkError('Offline'))).toBe('Offline');
  });

  it('should return connection error for axios error without response', () => {
    const error = { message: 'Network Error', response: undefined };
    expect(getErrorMessage(error)).toBe('Unable to connect. Please check your internet connection and try again.');
  });

  it('should extract message from axios error response data', () => {
    const error = {
      message: 'Request failed',
      response: { status: 400, data: { message: 'Bad input' } },
    };
    expect(getErrorMessage(error)).toBe('Bad input');
  });

  it('should return fallback for unknown errors', () => {
    expect(getErrorMessage(42)).toBe('An unexpected error occurred');
  });

  it('should return message from plain Error', () => {
    expect(getErrorMessage(new Error('generic'))).toBe('generic');
  });
});
