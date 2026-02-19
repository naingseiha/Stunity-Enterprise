/**
 * k6 Load Test Script for News Feed API
 * 
 * Install k6: brew install k6 (macOS) or https://k6.io/docs/getting-started/installation/
 * 
 * Usage:
 *   # Test with 100 users for 1 minute
 *   k6 run --vus 100 --duration 1m load-test-feed.js
 * 
 *   # Test with ramping users (realistic scenario)
 *   k6 run load-test-feed.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const cacheHitRate = new Rate('cache_hits');
const feedLoadTime = new Trend('feed_load_time');

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3010';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'YOUR_TEST_TOKEN_HERE';

export let options = {
  stages: [
    { duration: '30s', target: 50 },    // Ramp up to 50 users
    { duration: '1m', target: 100 },    // Ramp to 100 users
    { duration: '2m', target: 100 },    // Stay at 100 users
    { duration: '30s', target: 200 },   // Spike to 200 users
    { duration: '1m', target: 200 },    // Stay at 200
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                   // Error rate < 1%
    cache_hits: ['rate>0.7'],                         // Cache hit rate > 70%
  },
};

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Accept-Encoding': 'gzip',
};

export default function () {
  // Test 1: Fetch personalized feed (FOR_YOU mode)
  const feedResponse = http.get(`${BASE_URL}/posts/feed?mode=FOR_YOU&limit=20&page=1`, {
    headers,
    tags: { name: 'GetFeed' },
  });

  check(feedResponse, {
    'feed status is 200': (r) => r.status === 200,
    'feed has posts': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.length > 0;
      } catch {
        return false;
      }
    },
    'feed response time < 500ms': (r) => r.timings.duration < 500,
    'response is compressed': (r) => r.headers['Content-Encoding'] === 'gzip',
  });

  // Track cache hit (304 = cached, 200 from cache header)
  const isCacheHit = feedResponse.status === 304 || 
                     (feedResponse.headers['X-Cache'] || '').includes('HIT');
  cacheHitRate.add(isCacheHit);
  feedLoadTime.add(feedResponse.timings.duration);

  // Simulate user reading feed (3-5 seconds)
  sleep(3 + Math.random() * 2);

  // Test 2: Fetch next page (pagination)
  const page2Response = http.get(`${BASE_URL}/posts/feed?mode=FOR_YOU&limit=20&page=2`, {
    headers,
    tags: { name: 'GetFeedPage2' },
  });

  check(page2Response, {
    'page 2 status is 200': (r) => r.status === 200,
    'page 2 loads fast': (r) => r.timings.duration < 300,
  });

  sleep(2);

  // Test 3: Like a post (write operation)
  const posts = JSON.parse(feedResponse.body).data || [];
  if (posts.length > 0) {
    const randomPost = posts[Math.floor(Math.random() * posts.length)];
    
    const likeResponse = http.post(`${BASE_URL}/posts/${randomPost.id}/like`, null, {
      headers,
      tags: { name: 'LikePost' },
    });

    check(likeResponse, {
      'like status is 200': (r) => r.status === 200,
      'like is fast': (r) => r.timings.duration < 200,
    });
  }

  sleep(1);

  // Test 4: Track views (batched endpoint)
  const viewsToTrack = posts.slice(0, 5).map(p => ({
    postId: p.id,
    duration: 3 + Math.floor(Math.random() * 5),
    source: 'feed',
  }));

  if (viewsToTrack.length > 0) {
    const trackViewsResponse = http.post(
      `${BASE_URL}/feed/track-views`,
      JSON.stringify({ views: viewsToTrack }),
      {
        headers,
        tags: { name: 'TrackViews' },
      }
    );

    check(trackViewsResponse, {
      'track views status is 200': (r) => r.status === 200,
      'track views is fast': (r) => r.timings.duration < 100,
    });
  }

  // Simulate user scrolling/reading more content
  sleep(2 + Math.random() * 3);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n';
  summary += `${indent}✅ Load Test Results\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;
  
  // HTTP metrics
  const reqDuration = data.metrics.http_req_duration;
  summary += `${indent}📊 Response Times:\n`;
  summary += `${indent}  - p50: ${reqDuration.values.p50.toFixed(2)}ms\n`;
  summary += `${indent}  - p95: ${reqDuration.values.p95.toFixed(2)}ms\n`;
  summary += `${indent}  - p99: ${reqDuration.values.p99.toFixed(2)}ms\n`;
  summary += `${indent}  - max: ${reqDuration.values.max.toFixed(2)}ms\n\n`;
  
  // Request metrics
  const httpReqs = data.metrics.http_reqs;
  summary += `${indent}📈 Requests:\n`;
  summary += `${indent}  - Total: ${httpReqs.values.count}\n`;
  summary += `${indent}  - Rate: ${httpReqs.values.rate.toFixed(2)}/s\n\n`;
  
  // Error rate
  const failedReqs = data.metrics.http_req_failed;
  const errorRate = (failedReqs.values.rate * 100).toFixed(2);
  summary += `${indent}⚠️  Error Rate: ${errorRate}%\n\n`;
  
  // Cache hit rate
  if (data.metrics.cache_hits) {
    const cacheRate = (data.metrics.cache_hits.values.rate * 100).toFixed(2);
    summary += `${indent}💾 Cache Hit Rate: ${cacheRate}%\n\n`;
  }
  
  // Pass/Fail
  const p95Pass = reqDuration.values.p95 < 500;
  const errorPass = failedReqs.values.rate < 0.01;
  
  summary += `${indent}${'='.repeat(50)}\n`;
  summary += `${indent}${p95Pass && errorPass ? '✅ PASS' : '❌ FAIL'}\n`;
  
  if (!p95Pass) {
    summary += `${indent}❌ p95 latency too high (>500ms)\n`;
  }
  if (!errorPass) {
    summary += `${indent}❌ Error rate too high (>1%)\n`;
  }
  
  return summary;
}
