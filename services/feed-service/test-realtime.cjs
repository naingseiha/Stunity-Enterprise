const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const SUPABASE_URL = 'https://mwqdsxbxqlkrahoyqqox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13cWRzeGJ4cWxrcmFob3lxcW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMzU3NjUsImV4cCI6MjA4NjkxMTc2NX0.R5XvEJnYMNWzDgStHDtk39MLsfIlESijK82FqI8UNFg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let received = false;
const startTime = Date.now();

console.log('[' + new Date().toISOString() + '] Connecting to Supabase Realtime...');

supabase.channel('listen-' + Date.now())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, function (payload) {
        received = true;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('');
        console.log('=== SUCCESS! Realtime event received in ' + elapsed + 's ===');
        console.log('Event type:', payload.eventType);
        console.log('Post ID:', payload.new && payload.new.id);
        console.log('Content:', payload.new && String(payload.new.content || '').substring(0, 60));
        console.log('');
        console.log('REALTIME IS WORKING! The fix is complete.');
        process.exit(0);
    })
    .subscribe(function (status, err) {
        console.log('[' + new Date().toISOString() + '] Status:', status, err ? JSON.stringify(err) : '');

        if (status === 'SUBSCRIBED') {
            console.log('Subscribed! Now inserting via psql in 1 second...');

            setTimeout(function () {
                try {
                    const testId = 'rt-final-test-' + Date.now();
                    const result = execSync(
                        'PGPASSWORD=\'Iamaprogrammer2131\' psql "postgresql://postgres.mwqdsxbxqlkrahoyqqox@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "INSERT INTO public.posts (id, \\"authorId\\", content, \\"postType\\", visibility, \\"likesCount\\", \\"commentsCount\\", \\"sharesCount\\", \\"isEdited\\", \\"isPinned\\", \\"createdAt\\", \\"updatedAt\\", \\"mediaUrls\\", \\"mediaKeys\\", \\"topicTags\\", \\"trendingScore\\", \\"questionBounty\\") VALUES (\'' + testId + '\', \'cmm7b5w6o00009vnj1ln1syaq\', \'[RT FINAL TEST after GRANT]\', \'ARTICLE\', \'PUBLIC\', 0, 0, 0, false, false, now(), now(), ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 0, 0) RETURNING id;"'
                    ).toString();
                    console.log('psql insert result:', result.trim());
                    console.log('Waiting up to 8s for Realtime event...');
                } catch (e) {
                    console.error('psql error:', e.message);
                }
            }, 1000);

            setTimeout(function () {
                if (!received) {
                    console.error('FAIL: No event after 10s despite GRANT SELECT being applied.');
                    console.error('');
                    console.error('Next debug step: Check Supabase Dashboard → Realtime → Inspector');
                    console.error('to see if events are being sent by the server.');
                    process.exit(1);
                }
            }, 10000);
        }
    });

setTimeout(function () {
    if (!received) { console.error('TIMEOUT 15s'); process.exit(1); }
}, 15000);
