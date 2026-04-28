const authBase = process.env.AUTH_BASE_URL || 'http://127.0.0.1:3001';
const feedBase = process.env.FEED_BASE_URL || 'http://127.0.0.1:3010';
const adminEmail = process.env.FEED_SMOKE_ADMIN_EMAIL || 'admin@svaythom.edu.kh';
const adminPassword = process.env.FEED_SMOKE_ADMIN_PASSWORD || 'SvaythomAdmin2026!';
const secondUserEmail = process.env.FEED_SMOKE_SECOND_EMAIL || 'superadmin@stunity.com';
const secondUserPassword = process.env.FEED_SMOKE_SECOND_PASSWORD || 'StunityAdmin2026!';
const marker = `QA-FEED-${Date.now()}`;
const requestTimeoutMs = Number(process.env.FEED_SMOKE_TIMEOUT_MS || 15000);
const slowThresholdMs = Number(process.env.FEED_SMOKE_SLOW_MS || 2000);
const enforcePerfBudgets = process.env.FEED_SMOKE_ENFORCE_PERF === '1';

const defaultPerformanceBudgets = {
  'POST /auth/login': 3000,
  'POST /posts': 2500,
  'PUT /posts/:id': 3000,
  'GET /posts/:id': 2500,
  'DELETE /posts/:id': 2500,
  'POST /posts/:id/like': 2500,
  'POST /posts/:id/comments': 2500,
  'GET /posts/:id/comments': 2500,
  'DELETE /comments/:id': 2500,
  'POST /posts/:id/bookmark': 2500,
  'GET /bookmarks': 3000,
  'POST /posts/:id/value': 2500,
  'POST /posts/:id/share': 2500,
  'POST /posts/:id/repost': 3000,
  'POST /posts/:id/vote': 3000,
};

function normalizePath(path) {
  const pathname = path.split('?')[0];
  if (pathname === '/auth/login' || pathname === '/posts' || pathname === '/bookmarks') return pathname;
  if (pathname.startsWith('/comments/')) return '/comments/:id';
  return pathname.replace(/\/posts\/[^/]+/g, '/posts/:id');
}

function budgetFor(method, path) {
  const routeKey = `${method} ${normalizePath(path)}`;
  const envKey = `FEED_SMOKE_BUDGET_${routeKey
    .replace(/[^A-Z0-9]+/gi, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()}_MS`;
  const configured = process.env[envKey];
  return {
    routeKey,
    budgetMs: configured ? Number(configured) : defaultPerformanceBudgets[routeKey],
  };
}

const results = [];
const created = [];
const timings = [];

function compact(details = {}) {
  return Object.fromEntries(Object.entries(details).filter(([, value]) => value !== undefined));
}

function record(name, ok, details = {}) {
  results.push({ name, ok, ...compact(details) });
}

async function http(base, path, { method = 'GET', token, body } = {}) {
  const startedAt = Date.now();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    const durationMs = Date.now() - startedAt;
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    timings.push({ method, path, status: res.status, durationMs });
    return { status: res.status, ok: res.ok, json, text, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    timings.push({ method, path, status: 0, durationMs });
    return {
      status: 0,
      ok: false,
      json: { error: String(error?.cause?.code || error?.message || error) },
      text: '',
      durationMs,
    };
  }
}

async function login(email, password) {
  const response = await http(authBase, '/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!response.json?.success) {
    throw new Error(`Login failed for ${email}: ${response.status} ${response.text}`);
  }
  return response.json.data.tokens.accessToken;
}

function payloadFor(type, suffix = 'initial') {
  const payload = {
    content: `${marker} ${type} ${suffix}`,
    title: `${marker} ${type} title ${suffix}`,
    postType: type,
    visibility: 'PUBLIC',
    mediaUrls: [],
    mediaDisplayMode: 'AUTO',
    topicTags: ['qa', 'feed-smoke'],
  };

  if (type === 'POLL') {
    payload.pollOptions = ['Alpha', 'Beta', 'Gamma'];
    payload.pollSettings = { duration: 24 };
  }

  if (type === 'QUIZ') {
    payload.quizData = {
      questions: [
        {
          id: 'q1',
          question: '2 + 2?',
          options: ['3', '4'],
          correctAnswer: 1,
          points: 5,
          explanation: 'Basic arithmetic',
        },
      ],
      timeLimit: 0,
      passingScore: 70,
      totalPoints: 5,
      resultsVisibility: 'AFTER_SUBMISSION',
      shuffleQuestions: false,
      shuffleAnswers: false,
      maxAttempts: null,
      showReview: true,
      showExplanations: true,
    };
  }

  if (type === 'QUESTION') {
    payload.questionBounty = 0;
  }

  return payload;
}

async function createPost(token, type, suffix = 'initial') {
  const response = await http(feedBase, '/posts', {
    method: 'POST',
    token,
    body: payloadFor(type, suffix),
  });
  if (response.json?.success && response.json?.data?.id) {
    created.push({ id: response.json.data.id, token });
  }
  return response;
}

async function cleanup() {
  const deleted = [];
  for (const item of [...created].reverse()) {
    const response = await http(feedBase, `/posts/${item.id}`, {
      method: 'DELETE',
      token: item.token,
    });
    deleted.push({ id: item.id, status: response.status, ok: !!response.json?.success });
  }
  return deleted;
}

let cleanupReport = [];

try {
  const adminToken = await login(adminEmail, adminPassword);
  const secondToken = await login(secondUserEmail, secondUserPassword);
  record('auth: login primary + secondary users', true);

  const supportedTypes = [
    'ARTICLE',
    'COURSE',
    'QUIZ',
    'QUESTION',
    'EXAM',
    'ANNOUNCEMENT',
    'ASSIGNMENT',
    'POLL',
    'RESOURCE',
    'PROJECT',
    'TUTORIAL',
    'RESEARCH',
    'ACHIEVEMENT',
    'REFLECTION',
    'COLLABORATION',
    'CLUB_CREATED',
    'EVENT_CREATED',
  ];
  const legacyInvalidTypes = ['EVENT', 'CLUB_ANNOUNCEMENT'];

  for (const type of supportedTypes) {
    const createdResponse = await createPost(adminToken, type);
    const success =
      createdResponse.status === 201 &&
      createdResponse.json?.success &&
      createdResponse.json?.data?.postType === type;

    record(`create ${type}`, !!success, {
      status: createdResponse.status,
      error: createdResponse.json?.error || createdResponse.json?.details,
      durationMs: createdResponse.durationMs,
    });

    if (!success) continue;

    const postId = createdResponse.json.data.id;
    const updateBody = {
      content: `${marker} ${type} updated`,
      visibility: 'SCHOOL',
      mediaUrls: [],
      mediaDisplayMode: 'AUTO',
    };

    if (type === 'POLL') {
      updateBody.pollOptions = ['Edited One', 'Edited Two'];
    }

    if (type === 'QUIZ') {
      updateBody.quizData = {
        questions: [{ id: 'q2', question: '3 + 3?', options: ['5', '6'], correctAnswer: 1, points: 6 }],
        timeLimit: 0,
        passingScore: 80,
        totalPoints: 6,
        resultsVisibility: 'AFTER_SUBMISSION',
        shuffleQuestions: false,
        shuffleAnswers: false,
        maxAttempts: null,
        showReview: true,
        showExplanations: true,
      };
    }

    const updateResponse = await http(feedBase, `/posts/${postId}`, {
      method: 'PUT',
      token: adminToken,
      body: updateBody,
    });
    record(`edit ${type}: content/visibility`, updateResponse.status === 200 && updateResponse.json?.data?.content === updateBody.content, {
      status: updateResponse.status,
      error: updateResponse.json?.error,
      durationMs: updateResponse.durationMs,
    });

    const fetchResponse = await http(feedBase, `/posts/${postId}`, { token: adminToken });
    record(`fetch ${type} after edit`, fetchResponse.status === 200 && fetchResponse.json?.data?.content === updateBody.content, {
      status: fetchResponse.status,
      error: fetchResponse.json?.error,
      durationMs: fetchResponse.durationMs,
    });

    if (type === 'POLL') {
      const options = fetchResponse.json?.data?.pollOptions?.map((option) => option.text) || [];
      record('edit POLL: options before votes', options.includes('Edited One') && options.includes('Edited Two'), {
        options: options.join('|'),
      });
    }

    if (type === 'QUIZ') {
      const question = fetchResponse.json?.data?.quiz?.questions?.[0]?.question;
      record('edit QUIZ: quiz questions', question === '3 + 3?', { question });
    }
  }

  for (const type of legacyInvalidTypes) {
    const response = await createPost(adminToken, type);
    record(`reject legacy invalid ${type}`, response.status === 400 && response.json?.success === false, {
      status: response.status,
      error: response.json?.error,
    });
  }

  const target = await createPost(secondToken, 'ARTICLE', 'action-target');
  if (!(target.status === 201 && target.json?.success)) {
    throw new Error(`Target create failed: ${target.status} ${target.text}`);
  }
  const targetId = target.json.data.id;
  record('actions: create public target by second user', true, { targetId });

  const like1 = await http(feedBase, `/posts/${targetId}/like`, { method: 'POST', token: adminToken });
  record('like target', like1.status === 200 && like1.json?.liked === true, {
    status: like1.status,
    body: like1.json?.error || like1.json?.message,
    durationMs: like1.durationMs,
  });

  const likedGet = await http(feedBase, `/posts/${targetId}`, { token: adminToken });
  record('like reflected in fetch', likedGet.json?.data?.isLikedByMe === true && likedGet.json?.data?.likesCount >= 1, {
    liked: likedGet.json?.data?.isLikedByMe,
    likes: likedGet.json?.data?.likesCount,
  });

  const like2 = await http(feedBase, `/posts/${targetId}/like`, { method: 'POST', token: adminToken });
  record('unlike target', like2.status === 200 && like2.json?.liked === false, {
    status: like2.status,
    body: like2.json?.error || like2.json?.message,
    durationMs: like2.durationMs,
  });

  const comment = await http(feedBase, `/posts/${targetId}/comments`, {
    method: 'POST',
    token: adminToken,
    body: { content: `${marker} comment` },
  });
  const commentId = comment.json?.data?.id;
  record('comment add', comment.status === 201 && !!commentId, {
    status: comment.status,
    error: comment.json?.error,
    durationMs: comment.durationMs,
  });

  const comments = await http(feedBase, `/posts/${targetId}/comments`, { token: adminToken });
  record('comment list contains new comment', comments.json?.data?.some((item) => item.id === commentId), {
    total: comments.json?.pagination?.total,
  });

  const commentsFast = await http(feedBase, `/posts/${targetId}/comments?includeTotal=false&limit=20`, { token: adminToken });
  record('comment list fast pagination works', commentsFast.json?.data?.some((item) => item.id === commentId), {
    status: commentsFast.status,
    hasMore: commentsFast.json?.pagination?.hasMore,
    total: commentsFast.json?.pagination?.total,
    durationMs: commentsFast.durationMs,
  });

  if (commentId) {
    const reply = await http(feedBase, `/posts/${targetId}/comments`, {
      method: 'POST',
      token: adminToken,
      body: { content: `${marker} reply`, parentId: commentId },
    });
    const replyId = reply.json?.data?.id;
    record('comment reply add', reply.status === 201 && replyId && reply.json?.data?.parentId === commentId, {
      status: reply.status,
      error: reply.json?.error,
      durationMs: reply.durationMs,
    });

    const commentLike = await http(feedBase, `/comments/${commentId}/like`, {
      method: 'POST',
      token: adminToken,
    });
    record('comment like target', commentLike.status === 200 && commentLike.json?.isLiked === true && commentLike.json?.likesCount >= 1, {
      status: commentLike.status,
      error: commentLike.json?.error,
      durationMs: commentLike.durationMs,
    });

    const commentUnlike = await http(feedBase, `/comments/${commentId}/like`, {
      method: 'POST',
      token: adminToken,
    });
    record('comment unlike target', commentUnlike.status === 200 && commentUnlike.json?.isLiked === false, {
      status: commentUnlike.status,
      error: commentUnlike.json?.error,
      durationMs: commentUnlike.durationMs,
    });

    if (replyId) {
      const commentsWithReply = await http(feedBase, `/posts/${targetId}/comments?includeTotal=false&limit=20`, { token: adminToken });
      const rootComment = commentsWithReply.json?.data?.find((item) => item.id === commentId);
      record('comment list includes reply state', commentsWithReply.status === 200 && rootComment?.replies?.some((item) => item.id === replyId), {
        status: commentsWithReply.status,
        error: commentsWithReply.json?.error,
        durationMs: commentsWithReply.durationMs,
      });
    }

    const deletedComment = await http(feedBase, `/comments/${commentId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    record('comment delete', deletedComment.status === 200 && deletedComment.json?.success, {
      status: deletedComment.status,
      error: deletedComment.json?.error,
      durationMs: deletedComment.durationMs,
    });
  }

  const bookmark1 = await http(feedBase, `/posts/${targetId}/bookmark`, { method: 'POST', token: adminToken });
  record('save/bookmark target', bookmark1.status === 200 && bookmark1.json?.bookmarked === true, {
    status: bookmark1.status,
    body: bookmark1.json?.error || bookmark1.json?.message,
    durationMs: bookmark1.durationMs,
  });

  const bookmarks = await http(feedBase, '/bookmarks', { token: adminToken });
  record('bookmarks list includes target', bookmarks.json?.data?.some((post) => post.id === targetId), {
    status: bookmarks.status,
    count: bookmarks.json?.pagination?.total,
    durationMs: bookmarks.durationMs,
  });

  const bookmarksFast = await http(feedBase, '/bookmarks?limit=50&includeTotal=false', { token: adminToken });
  record('bookmarks fast pagination includes target', bookmarksFast.json?.data?.some((post) => post.id === targetId), {
    status: bookmarksFast.status,
    hasMore: bookmarksFast.json?.pagination?.hasMore,
    count: bookmarksFast.json?.pagination?.total,
    durationMs: bookmarksFast.durationMs,
  });

  const bookmark2 = await http(feedBase, `/posts/${targetId}/bookmark`, { method: 'POST', token: adminToken });
  record('unsave/unbookmark target', bookmark2.status === 200 && bookmark2.json?.bookmarked === false, {
    status: bookmark2.status,
    body: bookmark2.json?.error || bookmark2.json?.message,
    durationMs: bookmark2.durationMs,
  });

  const value1 = await http(feedBase, `/posts/${targetId}/value`, {
    method: 'POST',
    token: adminToken,
    body: {
      accuracy: 5,
      helpfulness: 4,
      clarity: 5,
      depth: 4,
      difficulty: 'just_right',
      wouldRecommend: true,
    },
  });
  record('educational value submit', value1.status === 200 && value1.json?.data?.averageRating === 4.5, {
    status: value1.status,
    averageRating: value1.json?.data?.averageRating,
    error: value1.json?.error,
    durationMs: value1.durationMs,
  });

  const invalidValue = await http(feedBase, `/posts/${targetId}/value`, {
    method: 'POST',
    token: adminToken,
    body: {
      accuracy: 6,
      helpfulness: 4,
      clarity: 4,
      depth: 4,
      difficulty: 'just_right',
      wouldRecommend: true,
    },
  });
  record('educational value rejects invalid rating', invalidValue.status === 400 && invalidValue.json?.success === false, {
    status: invalidValue.status,
    error: invalidValue.json?.error,
  });

  const beforeShare = (await http(feedBase, `/posts/${targetId}`, { token: adminToken })).json?.data?.sharesCount || 0;
  const share = await http(feedBase, `/posts/${targetId}/share`, { method: 'POST', token: adminToken });
  const afterShare = (await http(feedBase, `/posts/${targetId}`, { token: adminToken })).json?.data?.sharesCount || 0;
  record('share increments count', share.status === 200 && afterShare === beforeShare + 1, {
    beforeShare,
    afterShare,
    status: share.status,
    durationMs: share.durationMs,
  });

  const repost = await http(feedBase, `/posts/${targetId}/repost`, {
    method: 'POST',
    token: adminToken,
    body: { comment: `${marker} repost` },
  });
  if (repost.json?.success && repost.json?.data?.id) {
    created.push({ id: repost.json.data.id, token: adminToken });
  }
  record('repost target from different user', repost.status === 200 && repost.json?.data?.repostOfId === targetId, {
    status: repost.status,
    error: repost.json?.error,
    durationMs: repost.durationMs,
  });

  const duplicateRepost = await http(feedBase, `/posts/${targetId}/repost`, {
    method: 'POST',
    token: adminToken,
    body: { comment: `${marker} duplicate repost` },
  });
  record('duplicate repost rejected', duplicateRepost.status === 400 && /already/i.test(duplicateRepost.json?.error || ''), {
    status: duplicateRepost.status,
    error: duplicateRepost.json?.error,
  });

  const selfRepost = await http(feedBase, `/posts/${targetId}/repost`, {
    method: 'POST',
    token: secondToken,
    body: { comment: `${marker} self repost` },
  });
  record('self repost rejected', selfRepost.status === 400 && /own/i.test(selfRepost.json?.error || ''), {
    status: selfRepost.status,
    error: selfRepost.json?.error,
  });

  const pollCreate = await createPost(secondToken, 'POLL', 'vote-target');
  if (pollCreate.status === 201 && pollCreate.json?.success) {
    const pollId = pollCreate.json.data.id;
    const optionId1 = pollCreate.json.data.pollOptions?.[0]?.id;
    const optionId2 = pollCreate.json.data.pollOptions?.[1]?.id;

    const vote1 = await http(feedBase, `/posts/${pollId}/vote`, {
      method: 'POST',
      token: adminToken,
      body: { optionId: optionId1 },
    });
    record('poll vote first option', vote1.status === 200 && vote1.json?.userVotedOptionId === optionId1, {
      status: vote1.status,
      voted: vote1.json?.userVotedOptionId,
      error: vote1.json?.error,
      durationMs: vote1.durationMs,
    });

    const vote2 = await http(feedBase, `/posts/${pollId}/vote`, {
      method: 'POST',
      token: adminToken,
      body: { optionId: optionId2 },
    });
    record('poll vote change option', vote2.status === 200 && vote2.json?.userVotedOptionId === optionId2, {
      status: vote2.status,
      voted: vote2.json?.userVotedOptionId,
      error: vote2.json?.error,
      durationMs: vote2.durationMs,
    });

    const editAfterVote = await http(feedBase, `/posts/${pollId}`, {
      method: 'PUT',
      token: secondToken,
      body: {
        content: `${marker} poll voted edited`,
        pollOptions: ['Should not replace A', 'Should not replace B'],
      },
    });
    const pollAfter = await http(feedBase, `/posts/${pollId}`, { token: adminToken });
    const optionTexts = pollAfter.json?.data?.pollOptions?.map((option) => option.text) || [];
    record('poll edit after votes does not crash', editAfterVote.status === 200 && editAfterVote.json?.success, {
      status: editAfterVote.status,
      error: editAfterVote.json?.error,
      durationMs: editAfterVote.durationMs,
    });
    record('poll options protected after votes', !optionTexts.includes('Should not replace A'), {
      optionTexts: optionTexts.join('|'),
    });
  } else {
    record('poll vote setup', false, {
      status: pollCreate.status,
      error: pollCreate.json?.error,
    });
  }
} catch (error) {
  record('smoke runner fatal', false, { error: String(error?.stack || error) });
} finally {
  cleanupReport = await cleanup();
}

const slowRequests = timings
  .filter((item) => item.durationMs >= slowThresholdMs)
  .sort((a, b) => b.durationMs - a.durationMs)
  .slice(0, 15);

const performanceBudgetViolations = timings
  .map((item) => {
    const { routeKey, budgetMs } = budgetFor(item.method, item.path);
    if (!budgetMs || item.status === 0 || item.durationMs <= budgetMs) return null;
    return { ...item, routeKey, budgetMs };
  })
  .filter(Boolean)
  .sort((a, b) => (b.durationMs - b.budgetMs) - (a.durationMs - a.budgetMs));

const summary = {
  marker,
  passed: results.filter((result) => result.ok).length,
  failed: results.filter((result) => !result.ok).length,
  failures: results.filter((result) => !result.ok),
  slowThresholdMs,
  slowRequests,
  performanceBudgets: {
    enforced: enforcePerfBudgets,
    violationCount: performanceBudgetViolations.length,
    violations: performanceBudgetViolations.slice(0, 20),
  },
  cleanup: cleanupReport,
};

console.log(JSON.stringify(summary, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}

if (enforcePerfBudgets && performanceBudgetViolations.length > 0) {
  process.exitCode = 1;
}
