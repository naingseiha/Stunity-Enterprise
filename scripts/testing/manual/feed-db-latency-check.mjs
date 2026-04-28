#!/usr/bin/env node
import dotenv from 'dotenv';
import pg from 'pg';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

const { Client } = pg;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const sampleCount = clamp(Number(process.env.FEED_DB_LATENCY_SAMPLES) || 8, 1, 100);
const warmupCount = clamp(Number(process.env.FEED_DB_LATENCY_WARMUPS) || 1, 0, 20);
const timeoutMs = clamp(Number(process.env.FEED_DB_LATENCY_TIMEOUT_MS) || 10000, 1000, 60000);
const budgetMs = clamp(Number(process.env.FEED_DB_LATENCY_BUDGET_MS) || 300, 1, 60000);
const enforceBudget = process.env.FEED_DB_LATENCY_ENFORCE === '1';
const connectionString =
  process.env.FEED_DB_LATENCY_URL ||
  process.env.DATABASE_READ_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL, DATABASE_READ_URL, or FEED_DB_LATENCY_URL is required.');
  process.exit(1);
}

const parseConnectionInfo = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    return {
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.replace(/^\//, '') || null,
      sslmode: url.searchParams.get('sslmode') || null,
      connectionLimit: url.searchParams.get('connection_limit') || null,
      poolTimeout: url.searchParams.get('pool_timeout') || null,
      usesPoolerHost: url.hostname.includes('pooler'),
      source: process.env.FEED_DB_LATENCY_URL
        ? 'FEED_DB_LATENCY_URL'
        : process.env.DATABASE_READ_URL
          ? 'DATABASE_READ_URL'
          : 'DATABASE_URL',
    };
  } catch {
    return { host: 'unparseable', source: 'configured-url' };
  }
};

const percentile = (sortedValues, percentileValue) => {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sortedValues.length) - 1)
  );
  return sortedValues[index];
};

const timeQuery = async (client) => {
  const start = performance.now();
  await client.query('SELECT 1');
  return Math.round(performance.now() - start);
};

const connectionInfo = parseConnectionInfo(connectionString);
const needsSsl =
  connectionString.includes('sslmode=require') ||
  (connectionInfo.host && connectionInfo.host.includes('supabase'));

const client = new Client({
  connectionString,
  connectionTimeoutMillis: timeoutMs,
  query_timeout: timeoutMs,
  statement_timeout: timeoutMs,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

try {
  const connectStart = performance.now();
  await client.connect();
  const connectMs = Math.round(performance.now() - connectStart);

  for (let i = 0; i < warmupCount; i += 1) {
    await timeQuery(client);
  }

  const samples = [];
  for (let i = 0; i < sampleCount; i += 1) {
    samples.push(await timeQuery(client));
  }

  await client.end();

  const sorted = [...samples].sort((a, b) => a - b);
  const summary = {
    connection: connectionInfo,
    samples,
    stats: {
      count: samples.length,
      connectMs,
      minMs: sorted[0],
      medianMs: percentile(sorted, 50),
      p95Ms: percentile(sorted, 95),
      maxMs: sorted[sorted.length - 1],
      budgetMs,
      budgetExceeded: percentile(sorted, 95) > budgetMs,
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  if (enforceBudget && summary.stats.budgetExceeded) {
    console.error(`DB latency p95 ${summary.stats.p95Ms}ms exceeds budget ${budgetMs}ms.`);
    process.exit(1);
  }
} catch (error) {
  await client.end().catch(() => undefined);
  console.error('DB latency check failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
