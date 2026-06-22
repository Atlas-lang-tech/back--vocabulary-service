import { describe, expect, it } from '@jest/globals';
import { validate } from './env.validation.js';

const validConfig = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/vocabulary',
  REDIS_HOST: 'localhost',
  // Strings on purpose: exercises enableImplicitConversion (env vars are strings).
  REDIS_PORT: '6379',
  REDIS_DB: '0',
  RABBITMQ_URL: 'amqp://localhost:5672',
};

describe('env validate', () => {
  it('accepts a full, valid config and coerces numeric strings', () => {
    const result = validate(validConfig);

    expect(result.REDIS_PORT).toBe(6379);
    expect(result.REDIS_DB).toBe(0);
  });

  it('accepts a config without the optional REDIS_PASSWORD', () => {
    expect(() => validate(validConfig)).not.toThrow();
  });

  it('passes through REDIS_PASSWORD when provided', () => {
    const result = validate({ ...validConfig, REDIS_PASSWORD: 'secret' });

    expect(result.REDIS_PASSWORD).toBe('secret');
  });

  it('throws when a required var is missing', () => {
    const { DATABASE_URL, ...withoutDb } = validConfig;
    void DATABASE_URL;

    expect(() => validate(withoutDb)).toThrow();
  });

  it('throws when RABBITMQ_URL is missing', () => {
    const { RABBITMQ_URL, ...withoutRabbit } = validConfig;
    void RABBITMQ_URL;

    expect(() => validate(withoutRabbit)).toThrow();
  });

  it('throws when REDIS_PORT is out of range', () => {
    expect(() => validate({ ...validConfig, REDIS_PORT: '70000' })).toThrow();
  });
});
