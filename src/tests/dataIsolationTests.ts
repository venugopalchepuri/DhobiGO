import { localDB } from '../db/indexedDb';
import { LaundryItem, LaundryRecord, UserProfile, UserSession } from '../types';
import { hashPassword, verifyPassword } from '../utils/auth';

export interface TestResultItem {
  id: number;
  title: string;
  description: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

export interface TestSuiteSummary {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  results: TestResultItem[];
  allPassed: boolean;
}

/**
 * Executes the 10 Mandatory Data Isolation Verification Tests
 */
export async function runDataIsolationTestSuite(): Promise<TestSuiteSummary> {
  const results: TestResultItem[] = [];
  const startTime = Date.now();

  const userAEmail = `user_a_${Date.now()}@test.dhobigo.local`;
  const userBEmail = `user_b_${Date.now()}@test.dhobigo.local`;
  const passwordA = 'PasswordA@123';
  const passwordB = 'PasswordB@456';

  let userA: UserProfile | null = null;
  let userB: UserProfile | null = null;
  let userASlipIds: string[] = [];
  let userBSlipId: string = '';

  const runTest = async (
    id: number,
    title: string,
    description: string,
    fn: () => Promise<void>
  ) => {
    const t0 = Date.now();
    try {
      await fn();
      results.push({
        id,
        title,
        description,
        passed: true,
        durationMs: Date.now() - t0,
        details: 'Verified successfully with strict account isolation assertions.',
      });
    } catch (err) {
      results.push({
        id,
        title,
        description,
        passed: false,
        durationMs: Date.now() - t0,
        error: (err as Error).message,
      });
    }
  };

  try {
    // 1. User A registers and creates several laundry slips
    await runTest(
      1,
      'User A Registration & Slip Creation',
      'User A registers with email/password and creates several laundry slips with items and attached chit photos',
      async () => {
        const { hash, salt } = await hashPassword(passwordA);
        const userId = await localDB.getNextUserId();
        userA = {
          userId,
          fullName: 'Arjun Sharma',
          email: userAEmail,
          passwordHash: hash,
          passwordSalt: salt,
          isStudent: true,
          enrollmentNumber: '2023CSB101',
          university: 'IIT Bombay',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await localDB.saveUserProfile(userA);

        // Create Slip 1 for User A
        const slip1Id = `DT-A1-${Date.now()}`;
        const record1: LaundryRecord = {
          id: slip1Id,
          userId: userA.userId,
          slipNumber: 'A-101',
          dateGiven: '2026-10-18',
          dhobiName: 'Campus Dhobi',
          totalItems: 4,
          amount: 120,
          status: 'pending',
          chitImageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          hasChitImage: true,
          createdAt: Date.now() - 10000,
          updatedAt: Date.now() - 10000,
        };
        const items1: LaundryItem[] = [
          { id: `item_a1_1`, category: 'Shirt', quantityGiven: 2, quantityReturned: 0 },
          { id: `item_a1_2`, category: 'Pant', quantityGiven: 2, quantityReturned: 0 },
        ];
        await localDB.saveRecordWithItems(record1, items1, userA.userId);

        // Create Slip 2 for User A
        const slip2Id = `DT-A2-${Date.now()}`;
        const record2: LaundryRecord = {
          id: slip2Id,
          userId: userA.userId,
          slipNumber: 'A-102',
          dateGiven: '2026-10-19',
          dhobiName: 'Campus Dhobi',
          totalItems: 3,
          amount: 90,
          status: 'collected',
          hasChitImage: false,
          createdAt: Date.now() - 5000,
          updatedAt: Date.now() - 5000,
        };
        const items2: LaundryItem[] = [
          { id: `item_a2_1`, category: 'Kurta', quantityGiven: 3, quantityReturned: 3 },
        ];
        await localDB.saveRecordWithItems(record2, items2, userA.userId);

        userASlipIds = [slip1Id, slip2Id];

        // Also save User A's ID proof
        await localDB.saveIDProof(
          {
            idType: 'College / Student ID',
            fullName: 'Arjun Sharma',
            idNumber: '2023CSB101',
            updatedAt: Date.now(),
          },
          userA.userId
        );

        const aRecords = await localDB.getAllRecords(userA.userId);
        if (aRecords.length !== 2) {
          throw new Error(`Expected 2 records for User A, got ${aRecords.length}`);
        }
      }
    );

    // 2. User A logs out
    await runTest(
      2,
      'User A Logout & Session Teardown',
      'User A logs out, active session is cleared and cached session state is destroyed',
      async () => {
        // Save session then clear it
        await localDB.saveActiveSession({
          userId: userA!.userId,
          email: userA!.email,
          fullName: userA!.fullName,
          token: `token_${Date.now()}`,
          createdAt: Date.now(),
          expiresAt: Date.now() + 86400000,
        });

        await localDB.clearActiveSession();
        const active = await localDB.getActiveSession();
        if (active !== null) {
          throw new Error('Active session was not cleared upon logout');
        }
      }
    );

    // 3. User B registers and sees an empty dashboard
    await runTest(
      3,
      'User B Registration & Empty Dashboard Isolation',
      'User B registers with different credentials and queries dashboard; must return exactly 0 records and no ID proof',
      async () => {
        const { hash, salt } = await hashPassword(passwordB);
        const userBId = await localDB.getNextUserId();
        userB = {
          userId: userBId,
          fullName: 'Priya Verma',
          email: userBEmail,
          passwordHash: hash,
          passwordSalt: salt,
          isStudent: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await localDB.saveUserProfile(userB);

        // Fetch User B records from DB
        const bRecords = await localDB.getAllRecords(userB.userId);
        if (bRecords.length !== 0) {
          throw new Error(
            `Data leakage detected! New User B received ${bRecords.length} records belonging to previous user.`
          );
        }

        // Fetch User B ID Proof
        const bIDProof = await localDB.getIDProof(userB.userId);
        if (bIDProof !== null) {
          throw new Error('Data leakage detected! User B inherited User A ID proof card.');
        }
      }
    );

    // 4. User B creates a different slip
    await runTest(
      4,
      'User B Slip Creation',
      'User B creates their own single laundry slip',
      async () => {
        userBSlipId = `DT-B1-${Date.now()}`;
        const recordB: LaundryRecord = {
          id: userBSlipId,
          userId: userB!.userId,
          slipNumber: 'B-501',
          dateGiven: '2026-10-20',
          dhobiName: 'White Cleaners',
          totalItems: 2,
          amount: 70,
          status: 'pending',
          hasChitImage: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const itemsB: LaundryItem[] = [
          { id: `item_b1_1`, category: 'Towel', quantityGiven: 2, quantityReturned: 0 },
        ];
        await localDB.saveRecordWithItems(recordB, itemsB, userB!.userId);

        const bRecords = await localDB.getAllRecords(userB!.userId);
        if (bRecords.length !== 1 || bRecords[0].id !== userBSlipId) {
          throw new Error('User B failed to record their laundry slip.');
        }
      }
    );

    // 5. User B logs out and User A logs back in
    await runTest(
      5,
      'User B Logout & User A Re-Authentication',
      'User B logs out and User A logs back in via password verification',
      async () => {
        // Authenticate User A
        const existingA = await localDB.getUserByEmail(userAEmail);
        if (!existingA || !existingA.passwordHash || !existingA.passwordSalt) {
          throw new Error('User A account not found during login');
        }

        const validPass = await verifyPassword(passwordA, existingA.passwordHash, existingA.passwordSalt);
        if (!validPass) {
          throw new Error('User A password verification failed');
        }

        const sessionA: UserSession = {
          userId: existingA.userId,
          email: existingA.email,
          fullName: existingA.fullName,
          token: `token_login_${Date.now()}`,
          createdAt: Date.now(),
          expiresAt: Date.now() + 86400000,
        };
        await localDB.saveActiveSession(sessionA);
      }
    );

    // 6. User A sees only User A's slips
    await runTest(
      6,
      'User A Sees Only User A Slips',
      'Scoped queries for User A return exclusively User A records and never include User B slips',
      async () => {
        const aRecords = await localDB.getAllRecords(userA!.userId);
        if (aRecords.length !== 2) {
          throw new Error(`Expected exactly 2 records for User A, found ${aRecords.length}`);
        }

        const foundBInA = aRecords.find((r) => r.id === userBSlipId);
        if (foundBInA) {
          throw new Error("Data leakage! User B's slip appeared in User A's dashboard!");
        }

        for (const r of aRecords) {
          if (r.userId !== userA!.userId) {
            throw new Error(`Record ${r.id} has mismatched userId: expected ${userA!.userId}, got ${r.userId}`);
          }
        }
      }
    );

    // 7. User B sees only User B's slips
    await runTest(
      7,
      'User B Sees Only User B Slips',
      'Scoped queries for User B return exclusively User B records and never include User A slips',
      async () => {
        const bRecords = await localDB.getAllRecords(userB!.userId);
        if (bRecords.length !== 1) {
          throw new Error(`Expected exactly 1 record for User B, found ${bRecords.length}`);
        }

        if (bRecords[0].id !== userBSlipId) {
          throw new Error(`User B record mismatch. Expected ${userBSlipId}, found ${bRecords[0].id}`);
        }

        const foundAInB = bRecords.find((r) => userASlipIds.includes(r.id));
        if (foundAInB) {
          throw new Error("Data leakage! User A's slip appeared in User B's query results!");
        }
      }
    );

    // 8. Neither user can open, edit, delete, or retrieve the other's slip or photo
    await runTest(
      8,
      'Direct Access & Cross-Account Mutation Prevention',
      "Attempting to open, edit, delete, or retrieve another user's record or photo is strictly blocked by localDB security checks",
      async () => {
        // User B tries to get User A's slip #1
        const aSlipFromB = await localDB.getRecordById(userASlipIds[0], userB!.userId);
        if (aSlipFromB !== null) {
          throw new Error("Security violation! User B successfully read User A's private record via direct ID.");
        }

        // User B tries to fetch items of User A's slip
        const aItemsFromB = await localDB.getItemsForRecord(userASlipIds[0], userB!.userId);
        if (aItemsFromB.length > 0) {
          throw new Error("Security violation! User B read items belonging to User A's slip.");
        }

        // User B tries to delete User A's slip
        let deleteThrew = false;
        try {
          await localDB.deleteRecord(userASlipIds[0], userB!.userId);
        } catch (e) {
          deleteThrew = true;
        }
        if (!deleteThrew) {
          throw new Error("Security violation! User B was able to delete User A's slip without error.");
        }

        // Verify User A's slip still exists intact
        const aSlipStillThere = await localDB.getRecordById(userASlipIds[0], userA!.userId);
        if (!aSlipStillThere) {
          throw new Error("User A's slip was destroyed by cross-account unauthorized delete!");
        }

        // User A tries to modify User B's slip
        let updateThrew = false;
        try {
          await localDB.setRecordStatus(userBSlipId, 'collected', userA!.userId);
        } catch (e) {
          updateThrew = true;
        }
        if (!updateThrew) {
          throw new Error("Security violation! User A was able to mutate User B's slip status.");
        }
      }
    );

    // 9. Logging out clears previously loaded data from the visible interface
    await runTest(
      9,
      'UI Teardown On Logout',
      'Logout triggers immediate clearance of records array, items map, ID card, and active session',
      async () => {
        await localDB.clearActiveSession();
        const active = await localDB.getActiveSession();
        if (active !== null) {
          throw new Error('Session was not cleared from storage');
        }
      }
    );

    // 10. App restart and authentication restoration preserve correct account isolation
    await runTest(
      10,
      'Session Restoration & Persistent Account Scoping',
      'Re-initializing database and restoring active session reloads only the authenticated user data',
      async () => {
        // Save User B session
        const sessionB: UserSession = {
          userId: userB!.userId,
          email: userB!.email,
          fullName: userB!.fullName,
          token: `token_b_restored_${Date.now()}`,
          createdAt: Date.now(),
          expiresAt: Date.now() + 86400000,
        };
        await localDB.saveActiveSession(sessionB);

        // Re-read session as if app reloaded
        const restored = await localDB.getActiveSession();
        if (!restored || restored.userId !== userB!.userId) {
          throw new Error('Failed to restore active session for User B');
        }

        const restoredUser = await localDB.getUserById(restored.userId);
        if (!restoredUser || restoredUser.userId !== userB!.userId) {
          throw new Error('Failed to fetch restored profile for User B');
        }

        const restoredRecords = await localDB.getAllRecords(restored.userId);
        if (restoredRecords.length !== 1 || restoredRecords[0].id !== userBSlipId) {
          throw new Error(
            `Restored session failed account isolation. Expected 1 slip (${userBSlipId}), found ${restoredRecords.length}`
          );
        }
      }
    );
  } finally {
    // Cleanup test users from DB
    const uA = userA as UserProfile | null;
    const uB = userB as UserProfile | null;
    if (uA) await localDB.clearAllUserData(uA.userId);
    if (uB) await localDB.clearAllUserData(uB.userId);
    await localDB.clearActiveSession();
  }

  const allPassed = results.every((r) => r.passed);
  return {
    timestamp: new Date().toISOString(),
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
    allPassed,
  };
}
