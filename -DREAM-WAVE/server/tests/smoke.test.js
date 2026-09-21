const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { boot, shutdown, getApp } = require('./helpers/harness');
const User = require('../models/User');

describe('API smoke (DW-ARCH-004 / DW-ARCH-005)', () => {
  before(async () => {
    await boot();
  });

  after(async () => {
    await shutdown();
  });

  it('GET /api/health returns status + mongo contract (no secrets)', async () => {
    const res = await request(getApp()).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(['ok', 'degraded'].includes(res.body.status));
    assert.ok(['up', 'down', 'connecting'].includes(res.body.mongo));
    assert.equal(res.body.mongo, 'up');
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.version, require('../package.json').version);
    assert.ok(res.body.time);
    const blob = JSON.stringify(res.body);
    assert.equal(blob.includes('mongodb://'), false);
    assert.equal(blob.includes('MONGODB_URI'), false);
    assert.equal(blob.includes('JWT_SECRET'), false);
  });

  it('GET /api/assets/:filename without auth returns 401', async () => {
    const res = await request(getApp()).get('/api/assets/does-not-exist.png');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('signup → me → sessions → refresh (cookie) → logout', async () => {
    const email = `smoke-${Date.now()}@dreamwave.test`;
    const password = 'TestPass1';

    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Smoke User', email, password });
    assert.equal(signup.status, 201);
    assert.ok(signup.body.token);
    assert.equal(signup.body.refreshToken, undefined);
    assert.ok(signup.body.data?.user?.email);

    const cookies = signup.headers['set-cookie'];
    assert.ok(cookies, 'expected dw_refresh Set-Cookie');
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : String(cookies);
    assert.match(cookieHeader, /dw_refresh=/);

    const token = signup.body.token;

    const me = await request(getApp())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.email, email);

    const sessions = await request(getApp())
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(sessions.status, 200);
    assert.ok(Array.isArray(sessions.body.data.sessions));
    assert.ok(sessions.body.data.sessions.length >= 1);

    const refresh = await request(getApp())
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader);
    assert.equal(refresh.status, 200);
    assert.ok(refresh.body.token);
    assert.equal(refresh.body.refreshToken, undefined);

    const logout = await request(getApp())
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader);
    assert.equal(logout.status, 200);

    const refreshAfter = await request(getApp())
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader);
    assert.equal(refreshAfter.status, 401);
  });

  it('login rejects bad password', async () => {
    const email = `smoke-bad-${Date.now()}@dreamwave.test`;
    await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Bad Login', email, password: 'TestPass1' });

    const res = await request(getApp())
      .post('/api/auth/login')
      .send({ email, password: 'WrongPass1' });
    assert.equal(res.status, 401);
  });

  it('verify-email link + forgot/reset password workflow', async () => {
    const email = `rc-auth-${Date.now()}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'RC Auth', email, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;

    const user = await User.findOne({ email });
    assert.ok(user);
    const verifyToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verified = await request(getApp()).get(`/api/auth/verify-email/${verifyToken}`);
    assert.equal(verified.status, 200);
    assert.equal(verified.body.success, true);

    const me = await request(getApp())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.isEmailVerified, true);

    const forgot = await request(getApp())
      .post('/api/auth/forgot-password')
      .send({ email });
    assert.equal(forgot.status, 200);

    const resetUser = await User.findOne({ email });
    const resetToken = resetUser.getResetPasswordToken();
    await resetUser.save({ validateBeforeSave: false });

    const reset = await request(getApp())
      .put(`/api/auth/reset-password/${resetToken}`)
      .send({ password: 'NewPass12' });
    assert.equal(reset.status, 200);
    assert.ok(reset.body.token);

    const oldLogin = await request(getApp())
      .post('/api/auth/login')
      .send({ email, password: 'TestPass1' });
    assert.equal(oldLogin.status, 401);

    const newLogin = await request(getApp())
      .post('/api/auth/login')
      .send({ email, password: 'NewPass12' });
    assert.equal(newLogin.status, 200);
    assert.ok(newLogin.body.token);

    const change = await request(getApp())
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${newLogin.body.token}`)
      .send({ currentPassword: 'NewPass12', newPassword: 'FinalPass1' });
    assert.equal(change.status, 200);
  });

  it('production env helpers reject wildcards and invalid origins', async () => {
    const { parseOrigins, isValidOrigin } = require('../config/env');
    assert.deepEqual(parseOrigins('https://app.dreamwave.ai, https://www.dreamwave.ai'), [
      'https://app.dreamwave.ai',
      'https://www.dreamwave.ai',
    ]);
    assert.equal(isValidOrigin('https://app.dreamwave.ai'), true);
    assert.equal(isValidOrigin('*'), false);
    assert.equal(isValidOrigin('not-a-url'), false);
  });

  it('GET /api/billing/plan returns entitlements catalog', async () => {
    const email = `billing-${Date.now()}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Billing User', email, password: 'TestPass1' });
    const token = signup.body.token;

    const res = await request(getApp())
      .get('/api/billing/plan')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.entitlements.planId, 'free');
    assert.ok(res.body.data.entitlements.monthlyCredits >= 1);
    assert.ok(Array.isArray(res.body.data.catalog));
    assert.equal(res.body.data.stripe.checkoutEnabled, false);
  });

  it('mentor send returns 402 when AI credits are exhausted', async () => {
    const email = `nocredit-${Date.now()}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'No Credit', email, password: 'TestPass1' });
    const token = signup.body.token;
    const userId = signup.body.data.user.id;

    await User.findByIdAndUpdate(userId, { credits: 0 });

    const created = await request(getApp())
      .post('/api/mentor')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Gate test', mode: 'mentor' });
    assert.equal(created.status, 201);

    const send = await request(getApp())
      .post(`/api/mentor/${created.body.data.conversation._id}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .field('content', 'Hello')
      .field('mode', 'mentor');
    assert.equal(send.status, 402);
    assert.match(String(send.body.message || ''), /credits/i);
  });

  it('POST /api/billing/checkout is disabled without Stripe config', async () => {
    const email = `checkout-${Date.now()}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Checkout User', email, password: 'TestPass1' });
    const token = signup.body.token;

    const res = await request(getApp())
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'pro' });
    assert.equal(res.status, 503);
  });

  it('POST /api/billing/webhook rejects invalid signature', async () => {
    const prevKey = process.env.STRIPE_SECRET_KEY;
    const prevWh = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = 'sk_test_51FakeKeyForSmokeTestsOnly000001';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_for_smoke_tests';

    const res = await request(getApp())
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=1700000000,v1=deadbeef')
      .send('{"type":"checkout.session.completed","data":{"object":{}}}');

    assert.equal(res.status, 400);

    process.env.STRIPE_SECRET_KEY = prevKey;
    process.env.STRIPE_WEBHOOK_SECRET = prevWh;
  });

  it('planIdFromPrice maps configured Stripe price ids', () => {
    process.env.STRIPE_PRICE_PRO = 'price_pro_test';
    process.env.STRIPE_PRICE_TEAM = 'price_team_test';
    const { planIdFromPrice } = require('../services/stripeService');
    assert.equal(planIdFromPrice('price_pro_test'), 'pro');
    assert.equal(planIdFromPrice('price_team_test'), 'team');
    assert.equal(planIdFromPrice('price_unknown'), null);
  });

  it('org create + me; non-member cannot list members', async () => {
    const ownerEmail = `org-owner-${Date.now()}@dreamwave.test`;
    const strangerEmail = `org-stranger-${Date.now()}@dreamwave.test`;

    const ownerSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Org Owner', email: ownerEmail, password: 'TestPass1' });
    assert.equal(ownerSignup.status, 201);
    const ownerToken = ownerSignup.body.token;

    const strangerSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Stranger', email: strangerEmail, password: 'TestPass1' });
    assert.equal(strangerSignup.status, 201);
    const strangerToken = strangerSignup.body.token;

    const emptyMe = await request(getApp())
      .get('/api/orgs/me')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(emptyMe.status, 200);
    assert.equal(emptyMe.body.data.organization, null);

    const created = await request(getApp())
      .post('/api/orgs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Acme University' });
    assert.equal(created.status, 201);
    assert.ok(created.body.data.organization.id);
    assert.equal(created.body.data.membership.role, 'owner');
    const orgId = created.body.data.organization.id;

    const me = await request(getApp())
      .get('/api/orgs/me')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.organization.id, orgId);

    const forbidden = await request(getApp())
      .get(`/api/orgs/${orgId}/members`)
      .set('Authorization', `Bearer ${strangerToken}`);
    assert.equal(forbidden.status, 403);

    const members = await request(getApp())
      .get(`/api/orgs/${orgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(members.status, 200);
    assert.ok(members.body.data.members.length >= 1);
  });

  it('org email invite: pending for unknown email; signup with token joins org', async () => {
    const ts = Date.now();
    const ownerEmail = `invite-owner-${ts}@dreamwave.test`;
    const inviteeEmail = `invitee-${ts}@dreamwave.test`;

    const ownerSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Invite Owner', email: ownerEmail, password: 'TestPass1' });
    assert.equal(ownerSignup.status, 201);
    const ownerToken = ownerSignup.body.token;

    const org = await request(getApp())
      .post('/api/orgs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Invite Org ${ts}` });
    assert.equal(org.status, 201);
    const orgId = org.body.data.organization.id;

    const invited = await request(getApp())
      .post(`/api/orgs/${orgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: inviteeEmail, role: 'member' });
    assert.equal(invited.status, 201);
    assert.equal(invited.body.data.status, 'pending_invite');
    assert.equal(invited.body.data.invite.email, inviteeEmail);

    const pending = await request(getApp())
      .get(`/api/orgs/${orgId}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(pending.status, 200);
    assert.equal(pending.body.data.invites.length, 1);

    const OrgInvite = require('../models/OrgInvite');
    const inviteDoc = await OrgInvite.findOne({ org: orgId, email: inviteeEmail, status: 'pending' });
    assert.ok(inviteDoc);

    // Recover raw token by creating a known token path: re-hash check via preview needs raw token.
    // Use service to mint a fresh invite with known token for signup acceptance.
    const { inviteSignupUrl } = require('../services/orgInviteService');
    const rawToken = OrgInvite.createToken();
    inviteDoc.tokenHash = OrgInvite.hashToken(rawToken);
    await inviteDoc.save();

    const preview = await request(getApp()).get(`/api/orgs/invite/${rawToken}`);
    assert.equal(preview.status, 200);
    assert.equal(preview.body.data.email, inviteeEmail);
    assert.equal(String(preview.body.data.organization.id), String(orgId));
    assert.ok(inviteSignupUrl(rawToken).includes('invite='));

    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({
        name: 'Invitee User',
        email: inviteeEmail,
        password: 'TestPass1',
        inviteToken: rawToken,
      });
    assert.equal(signup.status, 201);
    assert.equal(String(signup.body.data.user.organizationId), String(orgId));

    const me = await request(getApp())
      .get('/api/orgs/me')
      .set('Authorization', `Bearer ${signup.body.token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.organization.id, orgId);
    assert.equal(me.body.data.membership.role, 'member');

    const pendingAfter = await request(getApp())
      .get(`/api/orgs/${orgId}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(pendingAfter.status, 200);
    assert.equal(pendingAfter.body.data.invites.length, 0);
  });

  it('org-scoped goals: stamp on create; owner lists member goal; stranger denied', async () => {
    const ts = Date.now();
    const ownerEmail = `scope-owner-${ts}@dreamwave.test`;
    const memberEmail = `scope-member-${ts}@dreamwave.test`;
    const strangerEmail = `scope-stranger-${ts}@dreamwave.test`;

    const ownerSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Scope Owner', email: ownerEmail, password: 'TestPass1' });
    assert.equal(ownerSignup.status, 201);
    const ownerToken = ownerSignup.body.token;

    const memberSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Scope Member', email: memberEmail, password: 'TestPass1' });
    assert.equal(memberSignup.status, 201);
    const memberToken = memberSignup.body.token;

    const strangerSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Scope Stranger', email: strangerEmail, password: 'TestPass1' });
    assert.equal(strangerSignup.status, 201);
    const strangerToken = strangerSignup.body.token;

    const personalGoal = await request(getApp())
      .post('/api/goals')
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ title: 'Personal only goal' });
    assert.equal(personalGoal.status, 201);
    assert.equal(personalGoal.body.data.goal.organizationId, null);

    const org = await request(getApp())
      .post('/api/orgs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Scope Org ${ts}` });
    assert.equal(org.status, 201);
    const orgId = org.body.data.organization.id;

    const invited = await request(getApp())
      .post(`/api/orgs/${orgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberEmail, role: 'member' });
    assert.equal(invited.status, 201);

    const memberGoal = await request(getApp())
      .post('/api/goals')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Org member goal' });
    assert.equal(memberGoal.status, 201);
    assert.equal(String(memberGoal.body.data.goal.organizationId), String(orgId));
    const goalId = memberGoal.body.data.goal._id;

    const ownerList = await request(getApp())
      .get('/api/goals')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(ownerList.status, 200);
    assert.ok(ownerList.body.data.goals.some((g) => String(g._id) === String(goalId)));

    const ownerGet = await request(getApp())
      .get(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(ownerGet.status, 200);

    const strangerGet = await request(getApp())
      .get(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${strangerToken}`);
    assert.equal(strangerGet.status, 404);

    const memberSeesPersonal = await request(getApp())
      .get(`/api/goals/${personalGoal.body.data.goal._id}`)
      .set('Authorization', `Bearer ${memberToken}`);
    assert.equal(memberSeesPersonal.status, 404);

    const ownerOverview = await request(getApp())
      .get(`/api/orgs/${orgId}/overview`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(ownerOverview.status, 200);
    assert.equal(String(ownerOverview.body.data.organization.id), String(orgId));
    assert.ok(ownerOverview.body.data.membershipCounts.total >= 2);
    assert.ok(ownerOverview.body.data.totals.goalsTotal >= 1);
    assert.ok(
      ownerOverview.body.data.memberActivity.some(
        (m) => m.user && m.user.email === memberEmail && m.goals >= 1
      )
    );

    const memberOverview = await request(getApp())
      .get(`/api/orgs/${orgId}/overview`)
      .set('Authorization', `Bearer ${memberToken}`);
    assert.equal(memberOverview.status, 403);

    const strangerOverview = await request(getApp())
      .get(`/api/orgs/${orgId}/overview`)
      .set('Authorization', `Bearer ${strangerToken}`);
    assert.equal(strangerOverview.status, 403);

    const membersList = await request(getApp())
      .get(`/api/orgs/${orgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(membersList.status, 200);
    const memberRow = membersList.body.data.members.find(
      (m) => m.user && m.user.email === memberEmail
    );
    assert.ok(memberRow);

    const roleUp = await request(getApp())
      .patch(`/api/orgs/${orgId}/members/${memberRow.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'admin' });
    assert.equal(roleUp.status, 200);
    assert.equal(roleUp.body.data.membership.role, 'admin');

    const aiRun = await request(getApp())
      .post('/api/ai/run')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ mode: 'mentor', message: 'Org AI stamp check' });
    assert.equal(aiRun.status, 200);
    assert.equal(String(aiRun.body.data.conversation.organizationId), String(orgId));

    const removed = await request(getApp())
      .delete(`/api/orgs/${orgId}/members/${memberRow.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(removed.status, 200);

    const memberMe = await request(getApp())
      .get('/api/orgs/me')
      .set('Authorization', `Bearer ${memberToken}`);
    assert.equal(memberMe.status, 200);
    assert.equal(memberMe.body.data.organization, null);

    const strangerRole = await request(getApp())
      .patch(`/api/orgs/${orgId}/members/${memberRow.id}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ role: 'member' });
    assert.equal(strangerRole.status, 403);
  });

  it('org-scoped documents: stamp on upload; owner lists member doc; stranger denied', async () => {
    const ts = Date.now();
    const ownerEmail = `doc-owner-${ts}@dreamwave.test`;
    const memberEmail = `doc-member-${ts}@dreamwave.test`;
    const strangerEmail = `doc-stranger-${ts}@dreamwave.test`;

    const ownerSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Doc Owner', email: ownerEmail, password: 'TestPass1' });
    assert.equal(ownerSignup.status, 201);
    const ownerToken = ownerSignup.body.token;

    const memberSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Doc Member', email: memberEmail, password: 'TestPass1' });
    assert.equal(memberSignup.status, 201);
    const memberToken = memberSignup.body.token;

    const strangerSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Doc Stranger', email: strangerEmail, password: 'TestPass1' });
    assert.equal(strangerSignup.status, 201);
    const strangerToken = strangerSignup.body.token;

    const org = await request(getApp())
      .post('/api/orgs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Doc Org ${ts}` });
    assert.equal(org.status, 201);
    const orgId = org.body.data.organization.id;

    const invited = await request(getApp())
      .post(`/api/orgs/${orgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberEmail, role: 'member' });
    assert.equal(invited.status, 201);

    const uploaded = await request(getApp())
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${memberToken}`)
      .field('title', 'Org study notes')
      .attach('file', Buffer.from('Chapter 1: photosynthesis basics.\n'), 'notes.txt');
    assert.equal(uploaded.status, 201);
    assert.equal(String(uploaded.body.data.document.organizationId), String(orgId));
    const docId = uploaded.body.data.document._id;
    const fileUrl = uploaded.body.data.document.fileUrl;
    assert.ok(fileUrl);

    const ownerList = await request(getApp())
      .get('/api/documents')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(ownerList.status, 200);
    assert.ok(ownerList.body.data.documents.some((d) => String(d._id) === String(docId)));

    const ownerGet = await request(getApp())
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(ownerGet.status, 200);

    const strangerGet = await request(getApp())
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${strangerToken}`);
    assert.equal(strangerGet.status, 404);

    const assetName = String(fileUrl).split('/').pop();
    const ownerAsset = await request(getApp())
      .get(`/api/assets/${assetName}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(ownerAsset.status, 200);

    const strangerAsset = await request(getApp())
      .get(`/api/assets/${assetName}`)
      .set('Authorization', `Bearer ${strangerToken}`);
    assert.equal(strangerAsset.status, 403);
  });

  it('org-scoped habits: stamp on create; owner lists member habit; stranger denied', async () => {
    const ts = Date.now();
    const ownerEmail = `habit-owner-${ts}@dreamwave.test`;
    const memberEmail = `habit-member-${ts}@dreamwave.test`;
    const strangerEmail = `habit-stranger-${ts}@dreamwave.test`;

    const ownerSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Habit Owner', email: ownerEmail, password: 'TestPass1' });
    assert.equal(ownerSignup.status, 201);
    const ownerToken = ownerSignup.body.token;

    const memberSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Habit Member', email: memberEmail, password: 'TestPass1' });
    assert.equal(memberSignup.status, 201);
    const memberToken = memberSignup.body.token;

    const strangerSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Habit Stranger', email: strangerEmail, password: 'TestPass1' });
    assert.equal(strangerSignup.status, 201);
    const strangerToken = strangerSignup.body.token;

    const org = await request(getApp())
      .post('/api/orgs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Habit Org ${ts}` });
    assert.equal(org.status, 201);
    const orgId = org.body.data.organization.id;

    const invited = await request(getApp())
      .post(`/api/orgs/${orgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberEmail, role: 'member' });
    assert.equal(invited.status, 201);

    const created = await request(getApp())
      .post('/api/habits')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Daily review' });
    assert.equal(created.status, 201);
    assert.equal(String(created.body.data.habit.organizationId), String(orgId));
    const habitId = created.body.data.habit._id;

    const ownerList = await request(getApp())
      .get('/api/habits')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(ownerList.status, 200);
    assert.ok(ownerList.body.data.habits.some((h) => String(h._id) === String(habitId)));

    const strangerToggle = await request(getApp())
      .patch(`/api/habits/${habitId}/toggle`)
      .set('Authorization', `Bearer ${strangerToken}`);
    assert.equal(strangerToggle.status, 404);

    const skill = await request(getApp())
      .post('/api/learning/skills')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: `OrgSkill-${ts}`, mastery: 40 });
    assert.equal(skill.status, 200);
    assert.equal(String(skill.body.data.skill.organizationId), String(orgId));

    const ownerSkills = await request(getApp())
      .get('/api/learning/skills')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(ownerSkills.status, 200);
    assert.ok(
      ownerSkills.body.data.skills.some((s) => String(s._id) === String(skill.body.data.skill._id))
    );
  });

  it('login portal rejects company portal for institution org; OTP verifies email', async () => {
    const ts = Date.now();
    const email = `portal-${ts}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Portal User', email, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;

    const org = await request(getApp())
      .post('/api/orgs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `School ${ts}`, type: 'institution' });
    assert.equal(org.status, 201);
    assert.equal(org.body.data.organization.type, 'institution');

    const badPortal = await request(getApp())
      .post('/api/auth/login')
      .send({ email, password: 'TestPass1', portal: 'company' });
    assert.equal(badPortal.status, 403);

    const instLogin = await request(getApp())
      .post('/api/auth/login')
      .send({ email, password: 'TestPass1', portal: 'institution' });
    assert.equal(instLogin.status, 200);
    assert.equal(instLogin.body.data.portal, 'institution');
    assert.equal(instLogin.body.data.organization.type, 'institution');

    const sendOtp = await request(getApp())
      .post('/api/auth/otp/send')
      .set('Authorization', `Bearer ${instLogin.body.token}`);
    assert.equal(sendOtp.status, 200);

    const User = require('../models/User');
    const doc = await User.findOne({ email });
    assert.ok(doc.emailOtpHash);
    const code = doc.issueEmailOtp();
    await doc.save({ validateBeforeSave: false });

    const verify = await request(getApp())
      .post('/api/auth/otp/verify')
      .set('Authorization', `Bearer ${instLogin.body.token}`)
      .send({ code });
    assert.equal(verify.status, 200);
    assert.equal(verify.body.data.user.isEmailVerified, true);
  });

  it('institution platform: profile, structure, attendance, notifications', async () => {
    const ts = Date.now();
    const email = `inst-plat-${ts}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Inst Admin', email, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;

    const org = await request(getApp())
      .post('/api/orgs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `College ${ts}`, type: 'institution', institutionKind: 'college' });
    assert.equal(org.status, 201);
    assert.equal(org.body.data.organization.institutionKind, 'college');
    const orgId = org.body.data.organization.id;

    const profile = await request(getApp())
      .patch(`/api/orgs/${orgId}/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        profile: { description: 'Flagship campus', city: 'Hyderabad', country: 'IN' },
      });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data.organization.profile.city, 'Hyderabad');

    const settings = await request(getApp())
      .patch(`/api/orgs/${orgId}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ timezone: 'Asia/Kolkata', attendanceRequiredPercent: 80 });
    assert.equal(settings.status, 200);
    assert.equal(settings.body.data.settings.attendanceRequiredPercent, 80);

    const branch = await request(getApp())
      .post(`/api/orgs/${orgId}/branches`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Main Campus', code: 'MAIN' });
    assert.equal(branch.status, 201);

    const dept = await request(getApp())
      .post(`/api/orgs/${orgId}/departments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Computer Science', code: 'CSE', branch: branch.body.data.branch._id });
    assert.equal(dept.status, 201);

    const year = await request(getApp())
      .post(`/api/orgs/${orgId}/academic-years`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '2026-27',
        startDate: '2026-06-01',
        endDate: '2027-05-31',
        isCurrent: true,
      });
    assert.equal(year.status, 201);

    const semester = await request(getApp())
      .post(`/api/orgs/${orgId}/semesters`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        academicYear: year.body.data.academicYear._id,
        name: 'Odd Semester',
        order: 1,
        isCurrent: true,
      });
    assert.equal(semester.status, 201);

    const course = await request(getApp())
      .post(`/api/orgs/${orgId}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'B.Tech CSE', code: 'BT-CSE', department: dept.body.data.department._id });
    assert.equal(course.status, 201);

    const subject = await request(getApp())
      .post(`/api/orgs/${orgId}/subjects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Data Structures', code: 'DS101', course: course.body.data.course._id });
    assert.equal(subject.status, 201);

    const klass = await request(getApp())
      .post(`/api/orgs/${orgId}/classes`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'CSE-A',
        code: 'CSEA',
        department: dept.body.data.department._id,
        course: course.body.data.course._id,
        academicYear: year.body.data.academicYear._id,
        semester: semester.body.data.semester._id,
      });
    assert.equal(klass.status, 201);
    const classId = klass.body.data.class._id;

    const teacherEmail = `teacher-${ts}@dreamwave.test`;
    const teacherSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Teacher One', email: teacherEmail, password: 'TestPass1' });
    assert.equal(teacherSignup.status, 201);

    const addTeacher = await request(getApp())
      .post(`/api/orgs/${orgId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: teacherEmail, role: 'member', memberKind: 'teacher' });
    assert.equal(addTeacher.status, 201);
    assert.equal(addTeacher.body.data.membership.memberKind, 'teacher');

    const teachers = await request(getApp())
      .get(`/api/orgs/${orgId}/teachers`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(teachers.status, 200);
    assert.ok(teachers.body.data.teachers.length >= 1);

    const timetable = await request(getApp())
      .post(`/api/orgs/${orgId}/timetable`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        classSection: classId,
        subject: subject.body.data.subject._id,
        dayOfWeek: 'mon',
        startTime: '09:00',
        endTime: '10:00',
        room: 'A101',
      });
    assert.equal(timetable.status, 201);

    const studentId = signup.body.data.user.id;
    const attendance = await request(getApp())
      .post(`/api/orgs/${orgId}/attendance`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        classSection: classId,
        entries: [{ student: studentId, status: 'present' }],
      });
    assert.equal(attendance.status, 201);
    assert.equal(attendance.body.data.records.length, 1);

    const summary = await request(getApp())
      .get(`/api/orgs/${orgId}/attendance/summary`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(summary.status, 200);
    assert.ok(summary.body.data.total >= 1);

    const note = await request(getApp())
      .post(`/api/orgs/${orgId}/notifications`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Welcome', message: 'Semester starts Monday', audience: 'all' });
    assert.equal(note.status, 201);

    const dash = await request(getApp())
      .get(`/api/orgs/${orgId}/dashboard`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(dash.status, 200);
    assert.ok(dash.body.data.structure.branches >= 1);
    assert.ok(dash.body.data.structure.classes >= 1);
    assert.ok(dash.body.data.structure.teachers >= 1);

    const analytics = await request(getApp())
      .get(`/api/orgs/${orgId}/analytics`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(analytics.status, 200);
    assert.ok(analytics.body.data.academic);
  });

  it('company platform: profile, jobs, applications, talent, verification', async () => {
    const ts = Date.now();
    const companyEmail = `co-${ts}@dreamwave.test`;
    const studentEmail = `seeker-${ts}@dreamwave.test`;

    const companySignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Co Admin', email: companyEmail, password: 'TestPass1' });
    assert.equal(companySignup.status, 201);
    const companyToken = companySignup.body.token;

    const studentSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Job Seeker', email: studentEmail, password: 'TestPass1' });
    assert.equal(studentSignup.status, 201);
    const studentToken = studentSignup.body.token;
    const studentId = studentSignup.body.data.user.id;

    const org = await request(getApp())
      .post('/api/orgs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        name: `Acme ${ts}`,
        type: 'company',
        company: { industry: 'Technology', size: '11-50' },
        profile: { website: 'https://acme.test', city: 'Bengaluru' },
      });
    assert.equal(org.status, 201);
    assert.equal(org.body.data.organization.type, 'company');
    assert.equal(org.body.data.organization.company.industry, 'Technology');
    const orgId = org.body.data.organization.id;

    const profile = await request(getApp())
      .patch(`/api/orgs/${orgId}/company/profile`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        company: {
          locations: [{ label: 'HQ', city: 'Bengaluru', country: 'IN', isPrimary: true }],
        },
      });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data.organization.company.locations.length, 1);

    const verifyReq = await request(getApp())
      .post(`/api/orgs/${orgId}/company/verification`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ notes: 'Please verify' });
    assert.equal(verifyReq.status, 200);
    assert.equal(verifyReq.body.data.verificationStatus, 'pending');

    const job = await request(getApp())
      .post(`/api/orgs/${orgId}/jobs`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Junior Engineer',
        category: 'Engineering',
        skills: ['JavaScript', 'Node'],
        workMode: 'hybrid',
        location: 'Bengaluru',
        salary: { min: 600000, max: 900000, currency: 'INR' },
        status: 'draft',
      });
    assert.equal(job.status, 201);
    const jobId = job.body.data.job._id;

    const publish = await request(getApp())
      .post(`/api/orgs/${orgId}/jobs/${jobId}/publish`)
      .set('Authorization', `Bearer ${companyToken}`);
    assert.equal(publish.status, 200);
    assert.equal(publish.body.data.job.status, 'published');

    const publicJobs = await request(getApp())
      .get('/api/jobs')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(publicJobs.status, 200);
    assert.ok(publicJobs.body.data.jobs.some((j) => String(j._id) === String(jobId)));

    const apply = await request(getApp())
      .post(`/api/jobs/${jobId}/apply`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ coverLetter: 'I am excited to join.' });
    assert.equal(apply.status, 201);
    const applicationId = apply.body.data.application._id;

    const shortlist = await request(getApp())
      .patch(`/api/orgs/${orgId}/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'shortlisted', note: 'Strong skills' });
    assert.equal(shortlist.status, 200);
    assert.equal(shortlist.body.data.application.status, 'shortlisted');

    const interview = await request(getApp())
      .post(`/api/orgs/${orgId}/applications/${applicationId}/interview`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        mode: 'online',
        meetingUrl: 'https://meet.example/test',
      });
    assert.equal(interview.status, 200);
    assert.equal(interview.body.data.application.status, 'interview');

    const msg = await request(getApp())
      .post(`/api/orgs/${orgId}/company/messages`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ toUser: studentId, body: 'Looking forward to the interview', application: applicationId });
    assert.equal(msg.status, 201);

    const talent = await request(getApp())
      .get(`/api/orgs/${orgId}/company/talent?q=Seeker`)
      .set('Authorization', `Bearer ${companyToken}`);
    assert.equal(talent.status, 200);
    assert.ok(Array.isArray(talent.body.data.talent));

    const dash = await request(getApp())
      .get(`/api/orgs/${orgId}/company/dashboard`)
      .set('Authorization', `Bearer ${companyToken}`);
    assert.equal(dash.status, 200);
    assert.ok(dash.body.data.analytics.hiring.jobsPublished >= 1);
    assert.ok(dash.body.data.analytics.hiring.applicationsTotal >= 1);

    const myApps = await request(getApp())
      .get('/api/jobs/my-applications')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(myApps.status, 200);
    assert.ok(myApps.body.data.applications.some((a) => String(a._id) === String(applicationId)));

    const audits = await request(getApp())
      .get(`/api/orgs/${orgId}/company/audit-logs`)
      .set('Authorization', `Bearer ${companyToken}`);
    assert.equal(audits.status, 200);
    assert.ok(audits.body.data.logs.length >= 1);
  });

  it('books knowledge platform: create, search, chapters, annotations, libraries', async () => {
    const ts = Date.now();
    const email = `books-${ts}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Book User', email, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;

    const created = await request(getApp())
      .post('/api/books')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `Knowledge Systems ${ts}`,
        author: 'Dream Wave',
        category: 'Technology',
        subject: 'Learning',
        publisher: 'DW Press',
        isbn: '9780000000001',
        description: 'A guide to knowledge engines',
        tags: ['ai', 'learning'],
        scope: 'personal',
      });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.book.scope, 'personal');
    const bookId = created.body.data.book._id;

    const chapter = await request(getApp())
      .post(`/api/books/${bookId}/chapters`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Chapter 1 Foundations',
        order: 1,
        content: 'Knowledge graphs connect concepts across chapters for retrieval.',
      });
    assert.equal(chapter.status, 200);
    assert.ok(chapter.body.data.chapters.length >= 1);
    const chapterId = chapter.body.data.chapters[0]._id;

    const topics = await request(getApp())
      .put(`/api/books/${bookId}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ topics: [{ name: 'Knowledge Graphs', chapterOrder: 1 }, 'Retrieval'] });
    assert.equal(topics.status, 200);
    assert.ok(topics.body.data.topics.length >= 2);

    const search = await request(getApp())
      .get('/api/books/search')
      .query({ q: 'Knowledge Systems', topic: 'Retrieval' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(search.status, 200);
    assert.ok(search.body.data.books.some((b) => String(b._id) === String(bookId)));

    const personalLib = await request(getApp())
      .get('/api/books/library/personal')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(personalLib.status, 200);
    assert.ok(personalLib.body.data.books.some((b) => String(b._id) === String(bookId)));

    const highlight = await request(getApp())
      .post(`/api/books/${bookId}/highlights`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'connect concepts', chapterId, color: 'yellow' });
    assert.equal(highlight.status, 201);

    const note = await request(getApp())
      .post(`/api/books/${bookId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Review knowledge graphs weekly', chapterId });
    assert.equal(note.status, 201);

    const fav = await request(getApp())
      .post(`/api/books/${bookId}/favorite`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(fav.status, 200);
    assert.equal(fav.body.data.userBook.favorite, true);

    const progress = await request(getApp())
      .patch(`/api/books/${bookId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ readingProgress: 40, currentChapter: 1 });
    assert.equal(progress.status, 200);
    assert.equal(progress.body.data.userBook.readingProgress, 40);

    const getChapter = await request(getApp())
      .get(`/api/books/${bookId}/chapters/${chapterId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(getChapter.status, 200);
    assert.match(getChapter.body.data.chapter.content, /Knowledge graphs/);

    const publicList = await request(getApp())
      .get('/api/books')
      .query({ scope: 'public' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(publicList.status, 200);
    assert.ok(publicList.body.data.total >= 1);

    const del = await request(getApp())
      .delete(`/api/books/${bookId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(del.status, 200);
  });

  it('student platform: progress, goals/tasks complete notify, reports org stamp + delete', async () => {
    const ts = Date.now();
    const email = `student-plat-${ts}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Student Plat', email, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;

    const progress = await request(getApp())
      .get('/api/dashboard/progress')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(progress.status, 200);
    assert.ok(typeof progress.body.data.progress.overall === 'number');
    assert.ok(progress.body.data.progress.goals);
    assert.ok(progress.body.data.progress.books);

    const goal = await request(getApp())
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ship student backend', priority: 'high' });
    assert.equal(goal.status, 201);
    const goalId = goal.body.data.goal._id;

    const doneGoal = await request(getApp())
      .patch(`/api/goals/${goalId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ progress: 100 });
    assert.equal(doneGoal.status, 200);
    assert.equal(doneGoal.body.data.goal.status, 'completed');

    const task = await request(getApp())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Finish API gaps', priority: 'high' });
    assert.equal(task.status, 201);
    const toggle = await request(getApp())
      .patch(`/api/tasks/${task.body.data.task._id}/toggle`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(toggle.status, 200);
    assert.equal(toggle.body.data.task.status, 'done');

    const notes = await request(getApp())
      .get('/api/dashboard/notifications')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(notes.status, 200);
    assert.ok(notes.body.data.notifications.some((n) => /Goal completed|Task completed/.test(n.title)));

    const resume = await request(getApp())
      .get('/api/resume')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(resume.status, 200);
    assert.ok(resume.body.data.resume._id);

    const planner = await request(getApp())
      .post('/api/planner/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Study block', start: new Date().toISOString(), type: 'study' });
    assert.equal(planner.status, 201);

    const books = await request(getApp())
      .get('/api/books')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(books.status, 200);
    assert.ok(books.body.data.books.length >= 1);
    const bookId = books.body.data.books[0]._id;

    const bookProg = await request(getApp())
      .patch(`/api/books/${bookId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ readingProgress: 100 });
    assert.equal(bookProg.status, 200);
    assert.equal(bookProg.body.data.userBook.status, 'done');

    const org = await request(getApp())
      .post('/api/orgs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Student Org ${ts}`, type: 'institution' });
    assert.equal(org.status, 201);
    const orgId = org.body.data.organization.id;

    const Report = require('../models/Report');
    const stamped = await Report.create({
      user: signup.body.data.user.id,
      organizationId: orgId,
      title: 'Org Report',
      sections: [{ title: 'A', content: 'B' }],
    });

    const list = await request(getApp())
      .get('/api/reports')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(list.status, 200);
    assert.ok(list.body.data.reports.some((r) => String(r._id) === String(stamped._id)));

    const del = await request(getApp())
      .delete(`/api/reports/${stamped._id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(del.status, 200);

    const badHabit = await request(getApp())
      .post('/api/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '' });
    assert.equal(badHabit.status, 400);
  });

  it('AI platform: modes, models, credits, prompts, assistants, usage, stream, mentor history', async () => {
    const ts = Date.now();
    const email = `ai-plat-${ts}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'AI Platform', email, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;

    const modes = await request(getApp())
      .get('/api/ai/modes')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(modes.status, 200);
    assert.ok(modes.body.data.modes.some((m) => m.id === 'teacher'));
    assert.ok(modes.body.data.modes.some((m) => m.id === 'study'));
    assert.ok(modes.body.data.assistants.includes('interview-coach'));

    const models = await request(getApp())
      .get('/api/ai/models')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(models.status, 200);
    assert.ok(models.body.data.models.some((m) => m.id === 'gpt-4o-mini'));

    const credits = await request(getApp())
      .get('/api/ai/credits')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(credits.status, 200);
    assert.ok(typeof credits.body.data.credits === 'number');

    const promptCreate = await request(getApp())
      .post('/api/ai/prompts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Daily review',
        mode: 'mentor',
        body: 'Review my goals and suggest 3 actions',
        isFavorite: true,
      });
    assert.equal(promptCreate.status, 201);
    const promptId = promptCreate.body.data.prompt._id;

    const prompts = await request(getApp())
      .get('/api/ai/prompts')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(prompts.status, 200);
    assert.ok(prompts.body.data.prompts.some((p) => String(p._id) === String(promptId)));

    const teacher = await request(getApp())
      .post('/api/ai/assistants/teacher')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Explain recursion simply' });
    assert.equal(teacher.status, 200);
    assert.equal(teacher.body.data.mode, 'teacher');
    assert.ok(teacher.body.data.reply);
    assert.ok(teacher.body.data.model);

    const quick = await request(getApp())
      .post('/api/ai/quick')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'study-assistant', prompt: 'Plan 3 days for algorithms', model: 'fallback' });
    assert.equal(quick.status, 200);
    assert.equal(quick.body.data.mode, 'study');
    assert.equal(quick.body.data.saved, false);

    const stream = await request(getApp())
      .post('/api/ai/stream')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'career-guide', message: 'How do I become a backend engineer?' });
    assert.equal(stream.status, 200);
    assert.ok(String(stream.text).includes('"type":"done"') || String(stream.text).includes('"type":"chunk"'));

    const usage = await request(getApp())
      .get('/api/ai/usage')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(usage.status, 200);
    assert.ok(usage.body.data.summary.calls >= 3);
    assert.ok(usage.body.data.usage.length >= 1);

    const chat = await request(getApp())
      .post('/api/mentor')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Interview prep', mode: 'interview', model: 'fallback' });
    assert.equal(chat.status, 201);
    assert.equal(chat.body.data.conversation.mode, 'interview');
    const chatId = chat.body.data.conversation._id;

    const msg = await request(getApp())
      .post(`/api/mentor/${chatId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .field('content', 'Ask me a behavioral question')
      .field('model', 'fallback');
    assert.equal(msg.status, 200);
    assert.ok(msg.body.data.reply);

    const history = await request(getApp())
      .get('/api/mentor')
      .set('Authorization', `Bearer ${token}`)
      .query({ mode: 'interview' });
    assert.equal(history.status, 200);
    assert.ok(history.body.data.conversations.some((c) => String(c._id) === String(chatId)));

    const badMode = await request(getApp())
      .post('/api/ai/quick')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'not-a-real-mode', prompt: 'hi' });
    assert.equal(badMode.status, 400);

    await request(getApp())
      .delete(`/api/ai/prompts/${promptId}`)
      .set('Authorization', `Bearer ${token}`);
  });

  it('media platform: upload, publish, stream range, progress, favorites, analytics', async () => {
    const ts = Date.now();
    const email = `media-${ts}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Media User', email, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;

    const tinyMp3 = Buffer.from(
      'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T/xA0AAAAA',
      'base64'
    );

    const upload = await request(getApp())
      .post('/api/media')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Photosynthesis Intro')
      .field('type', 'audio')
      .field('category', 'Science')
      .field('subject', 'Biology')
      .field('grade', '8')
      .field('topics', 'plants,energy')
      .field('durationSec', '120')
      .field('allowDownload', 'true')
      .field('quizTriggerEnabled', 'true')
      .field('quizPrompt', 'Quiz yourself on photosynthesis')
      .attach('file', tinyMp3, 'lesson.mp3');
    assert.equal(upload.status, 201);
    assert.equal(upload.body.data.media.type, 'audio');
    assert.equal(upload.body.data.media.status, 'draft');
    const mediaId = upload.body.data.media._id;
    const fileUrl = upload.body.data.media.fileUrl;
    assert.ok(fileUrl.includes('/api/assets/'));

    const published = await request(getApp())
      .post(`/api/media/${mediaId}/publish`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(published.status, 200);
    assert.equal(published.body.data.media.status, 'published');

    const list = await request(getApp())
      .get('/api/media')
      .set('Authorization', `Bearer ${token}`)
      .query({ type: 'audio', subject: 'Biology' });
    assert.equal(list.status, 200);
    assert.ok(list.body.data.media.some((m) => String(m._id) === String(mediaId)));

    const meta = await request(getApp())
      .get('/api/media/meta')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(meta.status, 200);
    assert.ok(meta.body.data.categories.includes('Science'));

    const one = await request(getApp())
      .get(`/api/media/${mediaId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(one.status, 200);
    assert.ok(one.body.data.media.views >= 1);

    const stream = await request(getApp())
      .get(`/api/media/${mediaId}/stream`)
      .set('Authorization', `Bearer ${token}`)
      .set('Range', 'bytes=0-9');
    assert.equal(stream.status, 206);
    assert.ok(stream.headers['content-range']);
    assert.equal(stream.headers['accept-ranges'], 'bytes');

    const assetName = String(fileUrl).split('/').pop();
    const asset = await request(getApp())
      .get(`/api/assets/${assetName}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Range', 'bytes=0-5');
    assert.equal(asset.status, 206);

    const progress = await request(getApp())
      .post(`/api/media/${mediaId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ positionSec: 40, durationSec: 120, deltaWatchSec: 40 });
    assert.equal(progress.status, 200);
    assert.ok(progress.body.data.progress.percent > 0);

    const cont = await request(getApp())
      .get('/api/media/continue')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(cont.status, 200);
    assert.ok(cont.body.data.items.some((i) => String(i.media._id) === String(mediaId)));

    const fav = await request(getApp())
      .post(`/api/media/${mediaId}/favorite`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(fav.status, 200);
    assert.equal(fav.body.data.progress.favorite, true);

    const complete = await request(getApp())
      .post(`/api/media/${mediaId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ positionSec: 120, durationSec: 120, deltaWatchSec: 10 });
    assert.equal(complete.status, 200);
    assert.equal(complete.body.data.progress.completed, true);
    assert.ok(complete.body.data.quizTrigger?.enabled);

    const analytics = await request(getApp())
      .get('/api/media/analytics/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(analytics.status, 200);
    assert.ok(analytics.body.data.engagement.completed >= 1);

    const version = await request(getApp())
      .post(`/api/media/${mediaId}/versions`)
      .set('Authorization', `Bearer ${token}`)
      .field('note', 'Louder mix')
      .attach('file', tinyMp3, 'lesson-v2.mp3');
    assert.equal(version.status, 200);
    assert.ok(version.body.data.media.versionHistory.length >= 1);

    const dl = await request(getApp())
      .get(`/api/media/${mediaId}/download`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(dl.status, 200);

    const archived = await request(getApp())
      .post(`/api/media/${mediaId}/archive`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(archived.status, 200);
    assert.equal(archived.body.data.media.status, 'archived');
  });

  it('enterprise quality: headers, ready, sanitize, validation, disabled account, cleanup jobs', async () => {
    const health = await request(getApp()).get('/api/health');
    assert.equal(health.status, 200);
    assert.ok(health.headers['x-request-id']);
    assert.ok(health.headers['x-content-type-options']);

    const ready = await request(getApp()).get('/api/ready');
    assert.equal(ready.status, 200);
    assert.equal(ready.body.status, 'ready');
    assert.equal(ready.body.version, require('../package.json').version);

    const appModule = require('../server');
    appModule.setShuttingDown(true);
    const draining = await request(getApp()).get('/api/ready');
    assert.equal(draining.status, 503);
    assert.equal(draining.body.status, 'draining');
    const healthDrain = await request(getApp()).get('/api/health');
    assert.equal(healthDrain.status, 503);
    assert.equal(healthDrain.body.status, 'draining');
    appModule.setShuttingDown(false);
    const readyAgain = await request(getApp()).get('/api/ready');
    assert.equal(readyAgain.status, 200);
    assert.equal(readyAgain.body.status, 'ready');

    const ts = Date.now();
    const email = `ent-${ts}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Ent User', email, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;
    const userId = signup.body.data.user.id;

    const injection = await request(getApp())
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Safe goal', priority: 'high', $where: 'malicious' });
    assert.equal(injection.status, 201);
    assert.equal(injection.body.data.goal.title, 'Safe goal');

    const badGoal = await request(getApp())
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '' });
    assert.equal(badGoal.status, 400);
    assert.equal(badGoal.body.success, false);
    assert.ok(badGoal.body.requestId);

    const cast = await request(getApp())
      .get('/api/goals/not-an-object-id')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(cast.status, 400);

    const User = require('../models/User');
    await User.findByIdAndUpdate(userId, { isActive: false, refreshTokens: [] });

    const blocked = await request(getApp())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(blocked.status, 403);

    const loginDisabled = await request(getApp())
      .post('/api/auth/login')
      .send({ email, password: 'TestPass1' });
    assert.equal(loginDisabled.status, 403);

    await User.findByIdAndUpdate(userId, { isActive: true });

    const { runCleanupJobs } = require('../services/jobRunner');
    const summary = await runCleanupJobs();
    assert.ok(summary);
    assert.ok(typeof summary.latencyMs === 'number');

    const metricsAnon = await request(getApp()).get('/api/metrics');
    assert.equal(metricsAnon.status, 401);

    const metricsDenied = await request(getApp())
      .get('/api/metrics')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(metricsDenied.status, 403);

    const note = await request(getApp())
      .get('/api/dashboard/notifications')
      .set('Authorization', `Bearer ${token}`);
    // user was reactivated above — use fresh login
    const relogin = await request(getApp())
      .post('/api/auth/login')
      .send({ email, password: 'TestPass1' });
    assert.equal(relogin.status, 200);
    const liveToken = relogin.body.token;

    const Notification = require('../models/Notification');
    const created = await Notification.create({
      user: userId,
      title: 'Cleanup test',
      message: 'delete me',
      type: 'info',
      read: true,
    });
    const delNote = await request(getApp())
      .delete(`/api/dashboard/notifications/${created._id}`)
      .set('Authorization', `Bearer ${liveToken}`);
    assert.equal(delNote.status, 200);

    const settingsBad = await request(getApp())
      .put('/api/settings')
      .set('Authorization', `Bearer ${liveToken}`)
      .send({ theme: 'neon' });
    assert.equal(settingsBad.status, 400);

    void note;
  });

  it('AI learning ecosystem: profile, analytics, content, horizon plans, adaptive roadmap', async () => {
    const ts = Date.now();
    const email = `learn-eco-${ts}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Learner Eco', email, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;

    await request(getApp())
      .post('/api/learning/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Algorithms', mastery: 35, targetMastery: 80 });
    await request(getApp())
      .post('/api/learning/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Communication', mastery: 88, targetMastery: 80 });

    const profile = await request(getApp())
      .get('/api/learning/profile')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(profile.status, 200);
    assert.ok(profile.body.data.profile._id);

    const assess = await request(getApp())
      .post('/api/learning/profile/assess')
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: ['I learn with diagrams and videos', 'I practice by building projects'],
        selfRatings: [{ name: 'Algorithms', mastery: 40 }],
      });
    assert.equal(assess.status, 200);
    assert.ok(assess.body.data.profile.learningStyle);
    assert.ok(Array.isArray(assess.body.data.profile.weaknesses));

    const analytics = await request(getApp())
      .get('/api/learning/analytics')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(analytics.status, 200);
    assert.ok(analytics.body.data.analytics.heatmap.length >= 7);
    assert.ok(analytics.body.data.analytics.weakTopics.length >= 1);

    const explain = await request(getApp())
      .post('/api/learning/content/explain')
      .set('Authorization', `Bearer ${token}`)
      .send({ topic: 'Recursion', detail: 'base case and recursive case' });
    assert.equal(explain.status, 200);
    assert.ok(explain.body.data.content);

    const horizon = await request(getApp())
      .post('/api/learning/study-plans/horizon')
      .set('Authorization', `Bearer ${token}`)
      .send({ topic: 'Algorithms', horizon: 'weekly' });
    assert.equal(horizon.status, 201);
    assert.equal(horizon.body.data.plan.horizon, 'weekly');
    const planId = horizon.body.data.plan._id;

    const adjust = await request(getApp())
      .post(`/api/learning/study-plans/${planId}/adjust`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(adjust.status, 200);

    const recs = await request(getApp())
      .get('/api/learning/recommendations')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(recs.status, 200);
    assert.ok(recs.body.data.catalog);

    const adaptive = await request(getApp())
      .post('/api/roadmap/generate-adaptive')
      .set('Authorization', `Bearer ${token}`)
      .send({ career: 'Backend Engineer', level: 'beginner' });
    assert.equal(adaptive.status, 201);
    assert.ok(adaptive.body.data.milestones.length >= 1);
    const roadmapId = adaptive.body.data.roadmap._id;

    const milestones = await request(getApp())
      .get(`/api/roadmap/${roadmapId}/milestones`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(milestones.status, 200);
    assert.ok(milestones.body.data.dependencies);
  });

  it('AI research & knowledge engine: projects, docs, KM, search, analytics, AI', async () => {
    const ts = Date.now();
    const email = `research-eco-${ts}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Researcher Eco', email, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;

    const cats = await request(getApp())
      .get('/api/research/categories')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(cats.status, 200);
    assert.ok(cats.body.data.categories.includes('academic'));

    const created = await request(getApp())
      .post('/api/research/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Neural Networks Survey',
        category: 'science',
        description: 'Literature review',
        tags: ['ml', 'survey'],
      });
    assert.equal(created.status, 201);
    const projectId = created.body.data.project._id;
    assert.equal(created.body.data.project.status, 'active');

    const sampleText = [
      'Chapter 1 Introduction to Neural Networks',
      'Neural networks learn hierarchical representations from data.',
      'Chapter 2 Backpropagation and Optimization',
      'Gradient descent minimizes loss using backpropagation through layers.',
      'Key concepts include neurons, activation functions, and overfitting.',
    ].join('\n');

    const upload = await request(getApp())
      .post(`/api/research/projects/${projectId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(sampleText, 'utf8'), {
        filename: 'nn-survey.txt',
        contentType: 'text/plain',
      })
      .field('title', 'NN Survey Notes');
    assert.equal(upload.status, 201);
    const docId = upload.body.data.document._id;
    assert.ok((upload.body.data.document.keywords || []).length >= 1);
    assert.ok((upload.body.data.document.concepts || []).length >= 1);
    assert.ok(upload.body.data.document.knowledgeGraph);
    assert.ok((upload.body.data.document.knowledgeGraph.nodes || []).length >= 1);

    const knowledge = await request(getApp())
      .get(`/api/research/documents/${docId}/knowledge`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(knowledge.status, 200);
    assert.ok(Array.isArray(knowledge.body.data.knowledge.chapters));

    const progress = await request(getApp())
      .patch(`/api/research/documents/${docId}/reading-progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ percent: 40, lastPosition: 120 });
    assert.equal(progress.status, 200);
    assert.equal(progress.body.data.readingProgress.percent, 40);

    const note = await request(getApp())
      .post(`/api/research/projects/${projectId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hypothesis', body: 'Depth improves accuracy', tags: ['ml'], documentId: docId });
    assert.equal(note.status, 201);

    const highlight = await request(getApp())
      .post(`/api/research/projects/${projectId}/highlights`)
      .set('Authorization', `Bearer ${token}`)
      .send({ documentId: docId, text: 'hierarchical representations', color: 'yellow' });
    assert.equal(highlight.status, 201);

    const bookmark = await request(getApp())
      .post(`/api/research/projects/${projectId}/bookmarks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Backprop section', documentId: docId, position: 80 });
    assert.equal(bookmark.status, 201);

    const collection = await request(getApp())
      .post(`/api/research/projects/${projectId}/collections`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Core Papers', folderPath: '/papers', documentIds: [docId] });
    assert.equal(collection.status, 201);

    const tags = await request(getApp())
      .get(`/api/research/projects/${projectId}/tags`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(tags.status, 200);
    assert.ok(tags.body.data.tags.includes('ml'));

    const search = await request(getApp())
      .get('/api/research/search')
      .query({ q: 'Neural', type: 'all' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(search.status, 200);
    assert.ok(
      search.body.data.results.projects.length + search.body.data.results.documents.length >= 1
    );

    const analytics = await request(getApp())
      .get('/api/research/analytics')
      .query({ projectId })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(analytics.status, 200);
    assert.ok(analytics.body.data.analytics.documentStatistics.count >= 1);
    assert.ok(analytics.body.data.analytics.knowledgeGrowth.nodes >= 1);

    const summary = await request(getApp())
      .post(`/api/research/documents/${docId}/ai/summary`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    assert.equal(summary.status, 200);
    assert.ok(summary.body.data.result);

    const suggestions = await request(getApp())
      .post(`/api/research/projects/${projectId}/ai/suggestions`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(suggestions.status, 200);
    assert.ok(suggestions.body.data.result);

    const archived = await request(getApp())
      .post(`/api/research/projects/${projectId}/archive`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(archived.status, 200);
    assert.equal(archived.body.data.project.status, 'archived');

    const history = await request(getApp())
      .get(`/api/research/projects/${projectId}/history`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(history.status, 200);
    assert.ok(history.body.data.history.length >= 1);
  });

  it('AI career intelligence: profile, gaps, jobs, interview, resume, certs, analytics', async () => {
    const ts = Date.now();
    const email = `career-eco-${ts}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Career Eco', email, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;

    await request(getApp())
      .post('/api/learning/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'JavaScript', mastery: 75, targetMastery: 90 });
    await request(getApp())
      .post('/api/learning/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'SQL', mastery: 40, targetMastery: 80 });

    const profile = await request(getApp())
      .patch('/api/career/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetRole: 'Backend Engineer',
        interests: ['backend', 'apis'],
        preferredDomains: ['technology'],
        preferredCompanies: ['Acme'],
        experienceLevel: 'fresher',
        academic: { degree: 'B.Tech', major: 'CSE', semester: '6' },
      });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data.profile.targetRole, 'Backend Engineer');

    const gap = await request(getApp())
      .get('/api/career/skill-gap')
      .query({ role: 'Backend Engineer' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(gap.status, 200);
    assert.ok(Array.isArray(gap.body.data.gap.missing));
    assert.ok(gap.body.data.gap.requiredSkills.length >= 1);

    const recs = await request(getApp())
      .get('/api/career/recommendations')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(recs.status, 200);
    assert.ok(recs.body.data.careers.length >= 1);
    assert.ok(typeof recs.body.data.careers[0].matchScore === 'number');
    assert.ok(typeof recs.body.data.careers[0].confidence === 'number');
    assert.ok(recs.body.data.careers[0].reason);
    assert.ok(recs.body.data.salary.midpoint > 0);

    const roadmap = await request(getApp())
      .post('/api/career/roadmaps/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'placement', career: 'Backend Engineer', useAi: false });
    assert.equal(roadmap.status, 201);
    assert.equal(roadmap.body.data.roadmap.kind, 'placement');
    assert.ok(roadmap.body.data.roadmap.timeline.length >= 1);

    const jobs = await request(getApp())
      .get('/api/career/jobs/match')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(jobs.status, 200);
    assert.ok(Array.isArray(jobs.body.data.matches));

    const questions = await request(getApp())
      .post('/api/career/interview/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'Backend Engineer', type: 'mixed', useAi: false });
    assert.equal(questions.status, 200);
    assert.ok(questions.body.data.questions.length >= 3);

    const session = await request(getApp())
      .post('/api/career/interview/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        role: 'Backend Engineer',
        type: 'mock',
        questions: questions.body.data.questions.slice(0, 2),
      });
    assert.equal(session.status, 201);
    const sessionId = session.body.data.session._id;
    const qId = session.body.data.session.questions[0]._id;

    const answered = await request(getApp())
      .post(`/api/career/interview/sessions/${sessionId}/questions/${qId}/answer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answer: 'I would design a REST API with authentication and clear layering.' });
    assert.equal(answered.status, 200);
    assert.ok(typeof answered.body.data.question.score === 'number');

    const completed = await request(getApp())
      .post(`/api/career/interview/sessions/${sessionId}/complete`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(completed.status, 200);
    assert.equal(completed.body.data.session.status, 'completed');

    await request(getApp())
      .put('/api/resume')
      .set('Authorization', `Bearer ${token}`)
      .send({
        headline: 'Backend Engineer',
        summary: 'Student building APIs and services with JavaScript and SQL.',
        skills: ['JavaScript', 'Node.js', 'SQL'],
        projects: [{ name: 'API Lab', description: 'REST API with auth' }],
      });

    const resumeAnalyze = await request(getApp())
      .post('/api/career/resume/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetRole: 'Backend Engineer', useAi: false });
    assert.equal(resumeAnalyze.status, 200);
    assert.ok(resumeAnalyze.body.data.score >= 1);

    const certRec = await request(getApp())
      .get('/api/career/certifications/recommend')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(certRec.status, 200);
    assert.ok(certRec.body.data.certifications.length >= 1);

    const certAdd = await request(getApp())
      .post('/api/career/certifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'AWS Cloud Practitioner', provider: 'Amazon', status: 'planned' });
    assert.equal(certAdd.status, 201);
    const certId = certAdd.body.data.profile.certifications[0]._id;

    const certDone = await request(getApp())
      .post(`/api/career/certifications/${certId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ credentialId: 'AWS-TEST-1' });
    assert.equal(certDone.status, 200);
    assert.equal(certDone.body.data.certification.status, 'completed');

    const learning = await request(getApp())
      .get('/api/career/learning/recommendations')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(learning.status, 200);
    assert.ok(learning.body.data.recommendations.practiceProblems);

    const analytics = await request(getApp())
      .get('/api/career/analytics')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(analytics.status, 200);
    assert.ok(analytics.body.data.analytics.scores.careerReadiness >= 0);
    assert.ok(analytics.body.data.analytics.scores.placement >= 0);
  });

  it('AI community & collaboration: communities, discussions, teams, projects, DMs, mentors', async () => {
    const ts = Date.now();
    const signupA = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Collab Alpha', email: `collab-a-${ts}@dreamwave.test`, password: 'TestPass1' });
    const signupB = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Collab Beta', email: `collab-b-${ts}@dreamwave.test`, password: 'TestPass1' });
    assert.equal(signupA.status, 201);
    assert.equal(signupB.status, 201);
    const tokenA = signupA.body.token;
    const tokenB = signupB.body.token;
    const idA = signupA.body.data.user.id;
    const idB = signupB.body.data.user.id;

    const community = await request(getApp())
      .post('/api/collab/communities')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: `Algorithms Hub ${ts}`,
        type: 'subject',
        subject: 'Algorithms',
        tags: ['dsa', 'campus'],
      });
    assert.equal(community.status, 201);
    const communityId = community.body.data.community._id;

    const join = await request(getApp())
      .post(`/api/collab/communities/${communityId}/join`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert.equal(join.status, 200);

    const discussion = await request(getApp())
      .post(`/api/collab/communities/${communityId}/discussions`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Best way to learn recursion?',
        body: 'Looking for practice problems and explanations for recursion.',
        tags: ['recursion', 'dsa'],
      });
    assert.equal(discussion.status, 201);
    const discussionId = discussion.body.data.discussion._id;

    const reply = await request(getApp())
      .post(`/api/collab/discussions/${discussionId}/replies`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ body: 'Start with base cases, then draw the call stack.' });
    assert.equal(reply.status, 201);
    assert.ok(reply.body.data.discussion.replyCount >= 1);

    const react = await request(getApp())
      .post(`/api/collab/discussions/${discussionId}/react`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ emoji: 'like' });
    assert.equal(react.status, 200);

    const bookmark = await request(getApp())
      .post(`/api/collab/discussions/${discussionId}/bookmark`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert.equal(bookmark.status, 200);

    const summary = await request(getApp())
      .post(`/api/collab/discussions/${discussionId}/ai/summary`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(summary.status, 200);
    assert.ok(summary.body.data.summary);

    const team = await request(getApp())
      .post('/api/collab/teams')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: `Study Squad ${ts}`, communityId, tags: ['study'] });
    assert.equal(team.status, 201);
    const teamId = team.body.data.team._id;

    const addMember = await request(getApp())
      .post(`/api/collab/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: idB });
    assert.equal(addMember.status, 200);

    const notes = await request(getApp())
      .patch(`/api/collab/teams/${teamId}/workspace`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ sharedNotes: 'Week 1: recursion + trees' });
    assert.equal(notes.status, 200);

    const project = await request(getApp())
      .post('/api/collab/projects')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: `Capstone ${ts}`, teamId, status: 'active' });
    assert.equal(project.status, 201);
    const projectId = project.body.data.project._id;

    const milestone = await request(getApp())
      .post(`/api/collab/projects/${projectId}/milestones`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'MVP' });
    assert.equal(milestone.status, 201);
    const milestoneId = milestone.body.data.project.milestones[0]._id;

    const toggle = await request(getApp())
      .post(`/api/collab/projects/${projectId}/milestones/${milestoneId}/toggle`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(toggle.status, 200);
    assert.ok(toggle.body.data.project.progress >= 100);

    const mentorProfile = await request(getApp())
      .put('/api/collab/mentors/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        headline: 'DSA Mentor',
        expertise: ['Algorithms', 'Interviews'],
        availability: {
          acceptingBookings: true,
          slots: [{ day: 'mon', start: '10:00', end: '12:00' }],
        },
      });
    assert.equal(mentorProfile.status, 200);

    const booking = await request(getApp())
      .post('/api/collab/mentors/book')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        mentorId: idA,
        topic: 'Recursion practice',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      });
    assert.equal(booking.status, 201);
    const bookingId = booking.body.data.booking._id;

    const confirm = await request(getApp())
      .patch(`/api/collab/mentors/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'completed', sessionNotes: 'Covered recursion trees' });
    assert.equal(confirm.status, 200);

    const rate = await request(getApp())
      .post(`/api/collab/mentors/bookings/${bookingId}/rate`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ rating: 5, comment: 'Great session' });
    assert.equal(rate.status, 200);

    const conversation = await request(getApp())
      .post('/api/collab/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ participantIds: [idB], type: 'direct' });
    assert.equal(conversation.status, 201);
    const conversationId = conversation.body.data.conversation._id;

    const msg = await request(getApp())
      .post(`/api/collab/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .field('body', 'Hey, want to pair on the MVP?');
    assert.equal(msg.status, 201);

    const search = await request(getApp())
      .get('/api/collab/search')
      .query({ q: 'Algorithms', type: 'all' })
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(search.status, 200);

    const analytics = await request(getApp())
      .get('/api/collab/analytics')
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(analytics.status, 200);
    assert.ok(analytics.body.data.analytics.communitiesJoined >= 1);
  });

  it('AI knowledge graph & recommendations: rebuild, search, feed, intelligence, analytics', async () => {
    const ts = Date.now();
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Graph User', email: `graph-${ts}@dreamwave.test`, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;
    const userId = signup.body.data.user.id;

    await request(getApp())
      .post('/api/learning/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'JavaScript', mastery: 70 });
    await request(getApp())
      .post('/api/learning/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'System Design', mastery: 25 });

    const deniedRebuild = await request(getApp())
      .post('/api/graph/rebuild')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(deniedRebuild.status, 403);

    await User.findByIdAndUpdate(userId, { role: 'admin' });
    const rebuild = await request(getApp())
      .post('/api/graph/rebuild')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(rebuild.status, 200);
    assert.ok(rebuild.body.data.rebuild.nodesUpserted >= 1);

    const nodes = await request(getApp())
      .get('/api/graph/nodes')
      .query({ kind: 'career' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(nodes.status, 200);
    assert.ok(nodes.body.data.nodes.length >= 1);
    const careerKey = nodes.body.data.nodes[0].key;

    const traverse = await request(getApp())
      .get(`/api/graph/nodes/${encodeURIComponent(careerKey)}/traverse`)
      .query({ depth: 2 })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(traverse.status, 200);
    assert.ok(traverse.body.data.results);

    const deps = await request(getApp())
      .get(`/api/graph/nodes/${encodeURIComponent(careerKey)}/dependencies`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(deps.status, 200);

    const createEdge = await request(getApp())
      .post('/api/graph/edges')
      .set('Authorization', `Bearer ${token}`)
      .send({
        from: 'skill:javascript',
        to: 'skill:system-design',
        type: 'leads_to',
        weight: 2,
      });
    assert.equal(createEdge.status, 201);

    const recs = await request(getApp())
      .get('/api/graph/recommendations')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(recs.status, 200);
    assert.ok(recs.body.data.recommendations.careers);
    assert.ok(Array.isArray(recs.body.data.feed));
    if (recs.body.data.feed.length) {
      assert.ok(typeof recs.body.data.feed[0].score === 'number');
      assert.ok(recs.body.data.feed[0].reason);
      assert.ok(typeof recs.body.data.feed[0].confidence === 'number');
    }
    assert.ok(recs.body.data.recommendations.careers.length >= 1);
    assert.ok(typeof recs.body.data.recommendations.careers[0].score === 'number');

    const feed = await request(getApp())
      .get('/api/graph/feed')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(feed.status, 200);

    const history = await request(getApp())
      .get('/api/graph/history')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(history.status, 200);
    assert.ok(history.body.data.learningHistory.skills.length >= 1);

    const intel = await request(getApp())
      .get('/api/graph/intelligence')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(intel.status, 200);
    assert.ok(intel.body.data.intelligence.nextBestTopic);

    const search = await request(getApp())
      .get('/api/graph/search')
      .query({ q: 'Backend' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(search.status, 200);
    assert.ok(Array.isArray(search.body.data.results));

    const related = await request(getApp())
      .get('/api/graph/related')
      .query({ q: 'JavaScript' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(related.status, 200);
    assert.ok(related.body.data.related);

    const feedback = await request(getApp())
      .post('/api/graph/feedback')
      .set('Authorization', `Bearer ${token}`)
      .send({ itemType: 'career', itemKey: careerKey, score: 80, engaged: true });
    assert.equal(feedback.status, 201);

    const analytics = await request(getApp())
      .get('/api/graph/analytics')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(analytics.status, 200);
    assert.ok(analytics.body.data.analytics.knowledgeCoverage.nodes >= 1);
    assert.ok(analytics.body.data.analytics.recommendationAccuracy);
    assert.ok(
      typeof analytics.body.data.analytics.recommendationAccuracy.sampleSize === 'number'
    );
    assert.ok(typeof analytics.body.data.analytics.recommendationAccuracy.engaged === 'number');
  });

  it('Adaptive learning & animation intelligence: profile, path, progress, quiz, analytics', async () => {
    const ts = Date.now();
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Adaptive Learner', email: `adapt-${ts}@dreamwave.test`, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;

    await request(getApp())
      .post('/api/learning/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Recursion', mastery: 30 });
    await request(getApp())
      .post('/api/learning/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Arrays', mastery: 75 });

    const profile = await request(getApp())
      .patch('/api/adaptive/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ dailyGoalMinutes: 25, weeklyFocus: 'Recursion', difficulty: 'adaptive' });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data.profile.dailyGoalMinutes, 25);

    const refresh = await request(getApp())
      .post('/api/adaptive/refresh')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(refresh.status, 200);
    assert.ok(refresh.body.data.profile.detectedDifficulty);
    assert.ok(Array.isArray(refresh.body.data.profile.currentPath));

    const path = await request(getApp())
      .get('/api/adaptive/path')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(path.status, 200);
    assert.ok(path.body.data.lessonSequence);

    const daily = await request(getApp())
      .get('/api/adaptive/daily-goal')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(daily.status, 200);
    assert.ok(daily.body.data.goal.minutes >= 5);

    const weekly = await request(getApp())
      .get('/api/adaptive/weekly-plan')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(weekly.status, 200);
    assert.equal(weekly.body.data.plan.days.length, 7);

    const progress = await request(getApp())
      .post('/api/adaptive/progress/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'topic', key: 'recursion', label: 'Recursion' });
    assert.equal(progress.status, 200);
    assert.equal(progress.body.data.progress.completed, true);

    const skillDone = await request(getApp())
      .post('/api/adaptive/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'skill', label: 'Arrays', key: 'arrays', percent: 100, completed: true });
    assert.equal(skillDone.status, 200);

    // Create animation media for mapping
    const anim = await request(getApp())
      .post('/api/media')
      .set('Authorization', `Bearer ${token}`)
      .field('title', `Recursion Viz ${ts}`)
      .field('type', 'animation')
      .field('scope', 'personal')
      .attach('file', Buffer.from('GIF89a', 'utf8'), {
        filename: 'recur.gif',
        contentType: 'image/gif',
      });
    assert.ok([200, 201].includes(anim.status));
    const mediaId = anim.body.data?.media?._id || anim.body.data?.item?._id;

    if (mediaId) {
      const mapped = await request(getApp())
        .post(`/api/adaptive/animations/${mediaId}/map`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          topics: ['Recursion'],
          skills: ['Recursion'],
          difficulty: 'moderate',
          learningObjectives: ['Visualize call stack'],
        });
      assert.equal(mapped.status, 200);
      assert.ok((mapped.body.data.media.skills || []).includes('Recursion'));

      await request(getApp())
        .post('/api/adaptive/progress/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          kind: 'animation',
          key: String(mediaId),
          label: `Recursion Viz ${ts}`,
          refId: mediaId,
          refType: 'MediaItem',
        });
    }

    const animations = await request(getApp())
      .get('/api/adaptive/animations')
      .query({ topic: 'Recursion' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(animations.status, 200);
    assert.ok(Array.isArray(animations.body.data.animations));
    if (animations.body.data.animations.length) {
      assert.ok(typeof animations.body.data.animations[0].score === 'number');
      assert.ok(typeof animations.body.data.animations[0].confidence === 'number');
    }

    const recs = await request(getApp())
      .get('/api/adaptive/recommendations')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(recs.status, 200);
    assert.ok(recs.body.data.recommendations.practice);
    if (recs.body.data.recommendations.practice.length) {
      assert.ok(typeof recs.body.data.recommendations.practice[0].confidence === 'number');
    }

    const quiz = await request(getApp())
      .post('/api/adaptive/quiz')
      .set('Authorization', `Bearer ${token}`)
      .send({ topic: 'Recursion', useAi: false });
    assert.equal(quiz.status, 201);
    assert.ok(quiz.body.data.quiz.questions.length >= 1);

    const achievements = await request(getApp())
      .get('/api/adaptive/achievements')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(achievements.status, 200);
    assert.ok(achievements.body.data.streak);

    const analytics = await request(getApp())
      .get('/api/adaptive/analytics')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(analytics.status, 200);
    assert.ok(typeof analytics.body.data.analytics.learningEffectiveness === 'number');
    assert.ok(analytics.body.data.analytics.completion);
  });

  it('productivity intelligence & smart workspace engine', async () => {
    const ts = Date.now();
    const email = `prod-${ts}@example.com`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Prod User', email, password: 'Password1!' });
    assert.ok([200, 201].includes(signup.status));
    const token = signup.body.token;

    // mark verified for AI routes (same pattern as other suites)
    const User = require('../models/User');
    await User.updateOne({ email }, { $set: { isEmailVerified: true } });

    const workspace = await request(getApp())
      .get('/api/productivity/workspace')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(workspace.status, 200);
    assert.ok(workspace.body.data.workspace.widgets?.length >= 1);

    const prefs = await request(getApp())
      .patch('/api/productivity/workspace')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Focus HQ',
        preferences: { focusMinutes: 30, breakMinutes: 5, workStartHour: 8, workEndHour: 17 },
      });
    assert.equal(prefs.status, 200);
    assert.equal(prefs.body.data.workspace.name, 'Focus HQ');
    assert.equal(prefs.body.data.workspace.preferences.focusMinutes, 30);

    const goal = await request(getApp())
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `Ship portfolio ${ts}`,
        category: 'learning',
        priority: 'high',
        tags: ['career'],
        milestones: [{ title: 'Draft' }, { title: 'Polish' }],
      });
    assert.equal(goal.status, 201);
    const goalId = goal.body.data.goal._id;

    const taskA = await request(getApp())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `Write README ${ts}`,
        priority: 'high',
        estimatedMinutes: 45,
        goal: goalId,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      });
    assert.equal(taskA.status, 201);
    const taskAId = taskA.body.data.task._id;

    const taskB = await request(getApp())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `Record demo ${ts}`,
        priority: 'medium',
        estimatedMinutes: 60,
        recurrence: { enabled: true, frequency: 'weekly', interval: 1 },
      });
    assert.equal(taskB.status, 201);
    const taskBId = taskB.body.data.task._id;

    const deps = await request(getApp())
      .patch(`/api/productivity/tasks/${taskBId}/dependencies`)
      .set('Authorization', `Bearer ${token}`)
      .send({ dependsOn: [taskAId] });
    assert.equal(deps.status, 200);
    assert.equal(deps.body.data.task.status, 'blocked');

    const prioritize = await request(getApp())
      .post('/api/productivity/tasks/prioritize')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(prioritize.status, 200);
    assert.ok(prioritize.body.data.tasks.length >= 2);
    assert.ok(typeof prioritize.body.data.tasks[0].aiPriorityScore === 'number');

    const schedule = await request(getApp())
      .post('/api/productivity/tasks/smart-schedule')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    assert.equal(schedule.status, 200);
    assert.ok(Array.isArray(schedule.body.data.scheduled));

    const progress = await request(getApp())
      .patch(`/api/productivity/tasks/${taskAId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ progress: 40, loggedMinutes: 20 });
    assert.equal(progress.status, 200);
    assert.equal(progress.body.data.task.progress, 40);

    const note = await request(getApp())
      .post('/api/productivity/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `Sprint notes ${ts}`,
        content: 'Shipped auth. Next: productivity dashboard widgets and focus timer.',
        category: 'work',
        tags: ['sprint', 'focus'],
        relatedGoal: goalId,
      });
    assert.equal(note.status, 201);
    const noteId = note.body.data.note._id;

    const search = await request(getApp())
      .get('/api/productivity/notes')
      .query({ q: 'dashboard' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(search.status, 200);
    assert.ok(search.body.data.notes.some((n) => n._id === noteId));

    const summarize = await request(getApp())
      .post(`/api/productivity/notes/${noteId}/summarize`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(summarize.status, 200);
    assert.ok(summarize.body.data.note.aiSummary);

    const focusStart = await request(getApp())
      .post('/api/productivity/focus/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Deep work', mode: 'pomodoro', plannedMinutes: 25, relatedTask: taskAId });
    assert.equal(focusStart.status, 201);
    const sessionId = focusStart.body.data.session._id;

    const pause = await request(getApp())
      .post(`/api/productivity/focus/${sessionId}/pause`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(pause.status, 200);

    const resume = await request(getApp())
      .post(`/api/productivity/focus/${sessionId}/resume`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(resume.status, 200);

    const complete = await request(getApp())
      .post(`/api/productivity/focus/${sessionId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ interruptions: 1 });
    assert.equal(complete.status, 200);
    assert.equal(complete.body.data.session.status, 'completed');
    assert.ok(complete.body.data.session.productivityScore >= 0);

    const focusStats = await request(getApp())
      .get('/api/productivity/focus/stats')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(focusStats.status, 200);
    assert.ok(focusStats.body.data.breakRecommendation);

    const studyEv = await request(getApp())
      .post('/api/planner/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'DSA practice',
        type: 'study',
        start: new Date(Date.now() + 3600000).toISOString(),
        end: new Date(Date.now() + 7200000).toISOString(),
        reminderAt: new Date(Date.now() + 1800000).toISOString(),
      });
    assert.equal(studyEv.status, 201);

    const interviewEv = await request(getApp())
      .post('/api/productivity/reminders/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Mock interview',
        type: 'interview',
        start: new Date(Date.now() + 86400000).toISOString(),
      });
    assert.equal(interviewEv.status, 201);

    const cal = await request(getApp())
      .get('/api/productivity/calendar')
      .query({ view: 'week' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(cal.status, 200);
    assert.ok(Array.isArray(cal.body.data.events));

    const studyCal = await request(getApp())
      .get('/api/productivity/calendar/study')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(studyCal.status, 200);

    const goalAnalytics = await request(getApp())
      .get('/api/productivity/goals/analytics')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(goalAnalytics.status, 200);
    assert.ok(goalAnalytics.body.data.analytics.total >= 1);

    const cats = await request(getApp())
      .get('/api/productivity/goals/categories')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(cats.status, 200);
    assert.ok(cats.body.data.categories.length >= 1);

    const analytics = await request(getApp())
      .get('/api/productivity/analytics')
      .query({ range: 'weekly' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(analytics.status, 200);
    assert.ok(typeof analytics.body.data.analytics.productivityScore === 'number');

    const dashboard = await request(getApp())
      .get('/api/productivity/dashboard')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(dashboard.status, 200);
    assert.ok(dashboard.body.data.snapshot);

    const reminders = await request(getApp())
      .post('/api/productivity/reminders/process')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(reminders.status, 200);
    assert.ok(typeof reminders.body.data.count === 'number');

    const aiDaily = await request(getApp())
      .post('/api/productivity/ai/daily-plan')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(aiDaily.status, 200);
    assert.ok(aiDaily.body.data.plan);

    const aiWeekly = await request(getApp())
      .post('/api/productivity/ai/weekly-plan')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(aiWeekly.status, 200);

    const aiGoals = await request(getApp())
      .post('/api/productivity/ai/goals')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(aiGoals.status, 200);
    assert.ok(aiGoals.body.data.suggestions.length >= 1);

    const aiTime = await request(getApp())
      .post('/api/productivity/ai/time-optimize')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(aiTime.status, 200);
    assert.ok(aiTime.body.data.recommendations.length >= 1);

    const widgets = await request(getApp())
      .put('/api/productivity/workspace/widgets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        widgets: [
          { id: 'tasks', type: 'tasks', title: 'Tasks', visible: true, order: 0, size: 'lg' },
          { id: 'focus', type: 'focus', title: 'Focus', visible: true, order: 1, size: 'md' },
        ],
      });
    assert.equal(widgets.status, 200);
    assert.equal(widgets.body.data.workspace.widgets.length, 2);
  });

  it('adaptive personalization & cross-platform intelligence engine', async () => {
    const ts = Date.now();
    const email = `persona-${ts}@example.com`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Persona User', email, password: 'Password1!', targetCareer: 'Full Stack Engineer' });
    assert.ok([200, 201].includes(signup.status));
    const token = signup.body.token;

    const User = require('../models/User');
    await User.updateOne({ email }, { $set: { isEmailVerified: true, targetCareer: 'Full Stack Engineer' } });

    const profile = await request(getApp())
      .get('/api/personalization/profile')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(profile.status, 200);
    assert.ok(profile.body.data.profile.privacy.personalizationEnabled);

    const prefs = await request(getApp())
      .patch('/api/personalization/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mentorTone: 'coach',
        dashboardLayout: 'learning',
        learningStyle: 'visual',
        contentTypes: ['lesson', 'animation', 'book'],
      });
    assert.equal(prefs.status, 200);
    assert.equal(prefs.body.data.profile.preferences.mentorTone, 'coach');

    await request(getApp())
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Master React ${ts}`, category: 'learning', priority: 'high' });

    await request(getApp())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Build component library ${ts}`, priority: 'high' });

    const evt = await request(getApp())
      .post('/api/personalization/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'learning_completed',
        module: 'learning',
        title: 'Finished hooks lesson',
        payload: { topic: 'react hooks' },
      });
    assert.equal(evt.status, 201);

    await request(getApp())
      .post('/api/personalization/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'book_finished',
        module: 'books',
        title: 'Finished Eloquent JS',
      });

    await request(getApp())
      .post('/api/personalization/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'recommendation_engaged',
        module: 'graph',
        title: 'Opened animation reco',
        payload: { itemType: 'animation', itemKey: 'react-hooks' },
        refId: 'anim-1',
      });

    const refresh = await request(getApp())
      .post('/api/personalization/refresh')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(refresh.status, 200);
    assert.ok(refresh.body.data.profile.sync);
    assert.ok(refresh.body.data.profile.nextBest.action);

    const dashboard = await request(getApp())
      .get('/api/personalization/dashboard')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(dashboard.status, 200);
    assert.ok(dashboard.body.data.dashboard.widgets.length >= 1);

    const surfaces = await request(getApp())
      .get('/api/personalization/surfaces')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(surfaces.status, 200);
    assert.ok(surfaces.body.data.mentorContext);

    const nextBest = await request(getApp())
      .get('/api/personalization/next-best')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(nextBest.status, 200);
    assert.ok(nextBest.body.data.nextBest.lesson);
    assert.ok(nextBest.body.data.nextBest.alternatives.length >= 1);

    const recs = await request(getApp())
      .get('/api/personalization/recommendations')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(recs.status, 200);
    assert.ok(Array.isArray(recs.body.data.items));
    assert.ok(recs.body.data.items.length >= 1);
    assert.ok(typeof recs.body.data.items[0].score === 'number');
    assert.ok(recs.body.data.items[0].reason);
    assert.ok(typeof recs.body.data.items[0].confidence === 'number');
    assert.ok(recs.body.data.nextBest);
    assert.ok(typeof recs.body.data.nextBest.confidence === 'number');
    assert.ok(recs.body.data.nextBest.reason);

    const progress = await request(getApp())
      .get('/api/personalization/progress')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(progress.status, 200);
    assert.ok(typeof progress.body.data.progress.learning === 'number');

    const sync = await request(getApp())
      .post('/api/personalization/sync')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(sync.status, 200);
    assert.ok(sync.body.data.sync);

    const mentorCtx = await request(getApp())
      .get('/api/personalization/mentor-context')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(mentorCtx.status, 200);
    assert.ok(String(mentorCtx.body.data.context).length > 10);

    const events = await request(getApp())
      .get('/api/personalization/events')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(events.status, 200);
    assert.ok(events.body.data.events.length >= 3);

    const analytics = await request(getApp())
      .get('/api/personalization/analytics')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(analytics.status, 200);
    assert.ok(typeof analytics.body.data.analytics.personalizationAccuracy === 'number');
    assert.ok(typeof analytics.body.data.analytics.recommendationEffectiveness === 'number');
    assert.ok(analytics.body.data.analytics.retention);

    const privacy = await request(getApp())
      .patch('/api/personalization/privacy')
      .set('Authorization', `Bearer ${token}`)
      .send({
        allowMentorContext: true,
        allowRecommendations: true,
        useBehaviourTracking: true,
        consented: true,
        consentVersion: '1.0',
      });
    assert.equal(privacy.status, 200);
    assert.ok(privacy.body.data.profile.privacy.consentedAt);
  });

  it('AI operations, enterprise monitoring & system optimization', async () => {
    const ts = Date.now();
    const email = `ops-admin-${ts}@example.com`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Ops Admin', email, password: 'Password1!' });
    assert.ok([200, 201].includes(signup.status));
    let token = signup.body.token;
    const userId = signup.body.data.user.id || signup.body.data.user._id;

    const User = require('../models/User');
    await User.findByIdAndUpdate(userId, { role: 'admin', isEmailVerified: true });

    const badLogin = await request(getApp())
      .post('/api/auth/login')
      .send({ email, password: 'WrongPass1!' });
    assert.equal(badLogin.status, 401);
    assert.equal(badLogin.body.failureClass, 'auth');

    const health = await request(getApp()).get('/api/health');
    assert.equal(health.status, 200);
    assert.ok(health.body.database || health.body.mongo);
    assert.ok(health.body.storage);
    assert.ok(health.body.queue);

    const metricsAnon = await request(getApp()).get('/api/metrics');
    assert.equal(metricsAnon.status, 401);

    const metrics = await request(getApp())
      .get('/api/metrics')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(metrics.status, 200);
    assert.ok(typeof metrics.body.data.avgLatencyMs === 'number');
    assert.ok(metrics.body.data.cpu);
    assert.ok(typeof metrics.body.data.authFailures === 'number');

    const opsHealth = await request(getApp())
      .get('/api/ops/health')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(opsHealth.status, 200);
    assert.ok(opsHealth.body.data.api);
    assert.ok(opsHealth.body.data.database);

    // seed AI usage
    const { recordAiUsage } = require('../services/entitlements');
    const adminUser = await User.findById(userId);
    await recordAiUsage(adminUser, {
      mode: 'mentor',
      source: 'mentor',
      model: 'gpt-4o-mini',
      latencyMs: 220,
      promptChars: 120,
      replyChars: 400,
      success: true,
    });
    await recordAiUsage(adminUser, {
      mode: 'daily',
      source: 'run',
      model: 'fallback',
      latencyMs: 40,
      promptChars: 80,
      replyChars: 200,
      success: false,
      errorCode: 'openai_failed',
      failureClass: 'ai_provider',
    });

    const aiOps = await request(getApp())
      .get('/api/ops/ai')
      .query({ days: 7 })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(aiOps.status, 200);
    assert.ok(aiOps.body.data.summary.requests >= 2);
    assert.ok(typeof aiOps.body.data.summary.estimatedCostUsd === 'number');
    assert.ok(Array.isArray(aiOps.body.data.byMode));
    assert.ok(aiOps.body.data.recommendations);
    assert.ok(typeof aiOps.body.data.recommendations.shown === 'number');
    assert.ok(typeof aiOps.body.data.recommendations.engaged === 'number');

    const perf = await request(getApp())
      .get('/api/ops/performance')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(perf.status, 200);
    assert.ok(perf.body.data.api);
    assert.ok(Array.isArray(perf.body.data.slowEndpoints));

    const security = await request(getApp())
      .get('/api/ops/security')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(security.status, 200);
    assert.ok(security.body.data.live);
    assert.ok(Array.isArray(security.body.data.recent));

    const trends = await request(getApp())
      .get('/api/ops/trends')
      .query({ days: 30 })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(trends.status, 200);
    assert.ok(trends.body.data.userGrowth.total >= 1);
    assert.ok(trends.body.data.organizationGrowth);

    const jobs = await request(getApp())
      .get('/api/ops/jobs')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(jobs.status, 200);
    assert.ok(jobs.body.data.status);

    const aggregate = await request(getApp())
      .post('/api/ops/aggregate')
      .set('Authorization', `Bearer ${token}`)
      .send({ period: 'daily' });
    assert.equal(aggregate.status, 200);
    assert.ok(aggregate.body.data.snapshot._id);

    const auditLogs = await request(getApp())
      .get('/api/ops/audit-logs')
      .query({ action: 'auth.login_failed' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(auditLogs.status, 200);
    assert.ok(auditLogs.body.data.logs.length >= 1);

    const runJobs = await request(getApp())
      .post('/api/ops/jobs/run')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(runJobs.status, 200);
    assert.ok(runJobs.body.data.summary);
    assert.ok(runJobs.body.data.summary.opsJobs);

    const adminDash = await request(getApp())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(adminDash.status, 200);
    assert.ok(typeof adminDash.body.data.analytics.aiRequests7d === 'number');
    assert.ok(typeof adminDash.body.data.analytics.organizations === 'number');

    // non-admin denied
    const userSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Ops User', email: `ops-user-${ts}@example.com`, password: 'Password1!' });
    const denied = await request(getApp())
      .get('/api/ops/ai')
      .set('Authorization', `Bearer ${userSignup.body.token}`);
    assert.equal(denied.status, 403);
  });

  it('final platform integration: search, pagination, events, readiness', async () => {
    const ts = Date.now();
    const email = `final-${ts}@example.com`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Final User', email, password: 'Password1!' });
    assert.ok([200, 201].includes(signup.status));
    const token = signup.body.token;
    const userId = signup.body.data.user.id;

    const User = require('../models/User');
    await User.findByIdAndUpdate(userId, { role: 'admin', isEmailVerified: true, targetCareer: 'Engineer' });

    const goal = await request(getApp())
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Integration Goal ${ts}`, category: 'learning', progress: 0 });
    assert.equal(goal.status, 201);
    const goalId = goal.body.data.goal._id;

    await request(getApp())
      .patch(`/api/goals/${goalId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ progress: 100 });

    const goalsList = await request(getApp())
      .get('/api/goals')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(goalsList.status, 200);
    assert.ok(goalsList.body.data.pagination);
    assert.ok(goalsList.body.data.pagination.total >= 1);

    const task = await request(getApp())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Integration Task ${ts}`, priority: 'high' });
    assert.equal(task.status, 201);
    await request(getApp())
      .patch(`/api/tasks/${task.body.data.task._id}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    const tasksList = await request(getApp())
      .get('/api/tasks')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(tasksList.status, 200);
    assert.ok(tasksList.body.data.pagination);

    const post = await request(getApp())
      .post('/api/community')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: `Integration community post ${ts}` });
    assert.ok([200, 201].includes(post.status));

    const adaptiveDone = await request(getApp())
      .post('/api/adaptive/progress/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'topic', key: 'integration', label: 'Integration topic' });
    assert.equal(adaptiveDone.status, 200);

    const events = await request(getApp())
      .get('/api/personalization/events')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(events.status, 200);
    const types = events.body.data.events.map((e) => e.type);
    assert.ok(types.includes('goal_achieved'));
    assert.ok(types.includes('task_completed'));
    assert.ok(types.includes('community_activity'));
    assert.ok(types.includes('learning_completed'));

    const habit = await request(getApp())
      .post('/api/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Habit ${ts}`, frequency: 'daily' });
    assert.equal(habit.status, 201);

    const report = await request(getApp())
      .post('/api/reports/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Report ${ts}`, career: 'Engineer' });
    assert.ok([200, 201].includes(report.status));

    const docsList = await request(getApp())
      .get('/api/documents')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(docsList.status, 200);
    assert.ok(docsList.body.data.pagination);

    const habitsList = await request(getApp())
      .get('/api/habits')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(habitsList.status, 200);
    assert.ok(habitsList.body.data.pagination);

    const reportsList = await request(getApp())
      .get('/api/reports')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(reportsList.status, 200);
    assert.ok(reportsList.body.data.pagination);
    assert.ok(reportsList.body.data.pagination.total >= 1);

    const communityList = await request(getApp())
      .get('/api/community')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(communityList.status, 200);
    assert.ok(communityList.body.data.pagination);

    const skillsList = await request(getApp())
      .get('/api/learning/skills')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(skillsList.status, 200);
    assert.ok(skillsList.body.data.pagination);

    const events2 = await request(getApp())
      .get('/api/personalization/events')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(events2.status, 200);
    const types2 = events2.body.data.events.map((e) => e.type);
    assert.ok(types2.includes('report_generated'));

    const analytics = await request(getApp())
      .get('/api/reports/analytics')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(analytics.status, 200);
    assert.ok(analytics.body.data.stats);

    const dashStats = await request(getApp())
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(dashStats.status, 200);
    assert.ok(dashStats.body.data.stats);

    const t0 = Date.now();
    const dashWarm = await request(getApp())
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${token}`);
    const dashMs = Date.now() - t0;
    assert.equal(dashWarm.status, 200);
    assert.ok(dashMs < 5000, `dashboard/stats too slow: ${dashMs}ms`);

    const t1 = Date.now();
    const reportsAnalytics = await request(getApp())
      .get('/api/reports/analytics')
      .set('Authorization', `Bearer ${token}`);
    const reportsMs = Date.now() - t1;
    assert.equal(reportsAnalytics.status, 200);
    assert.ok(reportsMs < 5000, `reports/analytics too slow: ${reportsMs}ms`);

    const search = await request(getApp())
      .get('/api/search')
      .query({ q: 'Integration', types: 'goals,tasks,community' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(search.status, 200);
    assert.ok(search.body.data.totalHits >= 1);
    assert.ok(Array.isArray(search.body.data.results.goals));

    const readiness = await request(getApp())
      .get('/api/ops/readiness')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(readiness.status, 200);
    assert.equal(readiness.body.data.status, 'production_ready');
    assert.equal(readiness.body.data.version, require('../package.json').version);
    assert.match(readiness.body.data.phase, /Production Release v1\.0\.0/);
    assert.ok(readiness.body.data.modules.length >= 20);
    assert.ok(readiness.body.data.checks.database);
    assert.ok(readiness.body.data.checks.readyProbe);
    assert.ok(readiness.body.data.checks.gracefulShutdown);

    // Book asset ACL: create personal book with file then fetch asset
    const book = await request(getApp())
      .post('/api/books/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', `Asset Book ${ts}`)
      .field('author', 'Tester')
      .field('category', 'general')
      .field('scope', 'personal')
      .attach('file', Buffer.from('%PDF-1.4 test', 'utf8'), {
        filename: `book-${ts}.pdf`,
        contentType: 'application/pdf',
      });
    assert.ok([200, 201].includes(book.status), `book upload status ${book.status}`);
    const fileUrl = book.body.data?.book?.fileUrl;
    if (fileUrl) {
      const filename = fileUrl.split('/').pop();
      const asset = await request(getApp())
        .get(`/api/assets/${filename}`)
        .set('Authorization', `Bearer ${token}`);
      assert.equal(asset.status, 200);

      const stranger = await request(getApp())
        .post('/api/auth/signup')
        .send({ name: 'Stranger', email: `stranger-${ts}@example.com`, password: 'Password1!' });
      const deniedAsset = await request(getApp())
        .get(`/api/assets/${filename}`)
        .set('Authorization', `Bearer ${stranger.body.token}`);
      assert.equal(deniedAsset.status, 403);
    }
  });
});
