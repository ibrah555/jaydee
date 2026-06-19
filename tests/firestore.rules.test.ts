import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import fs from 'fs';
import path from 'path';
import { describe, it, before, after } from 'mocha';

let testEnv: RulesTestEnvironment;

before(async function () {
  this.timeout(20000);
  const rulesPath = path.resolve(__dirname, '..', 'firebase', 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: 'jaydee-local',
    firestore: { rules }
  });
});

after(async () => {
  await testEnv.cleanup();
});

describe('Firestore security rules (transactions)', () => {
  it('rejects unauthenticated create', async () => {
    const alice = testEnv.unauthenticatedContext().firestore();
    await assertFails(alice.collection('transactions').add({ total: 100, createdAt: Date.now() }));
  });

  it('allows authenticated create', async () => {
    const bob = testEnv.authenticatedContext({ uid: 'owner-123' }).firestore();
    await assertSucceeds(bob.collection('transactions').add({ total: 100, createdAt: Date.now() }));
  });

  it('allows authenticated read', async () => {
    const bob = testEnv.authenticatedContext({ uid: 'owner-123' }).firestore();
    await assertSucceeds(bob.collection('transactions').get());
  });
});
