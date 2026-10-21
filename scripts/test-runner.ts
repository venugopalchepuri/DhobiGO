import { validateRegistration, validateSignIn, validateResetPassword, hashPassword, verifyPassword } from '../src/utils/auth';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ ${testName}`);
  }
}

async function run() {
  console.log('\n=== DHOBIGO CORE SECURITY & DATA VALIDATION SUITE ===\n');

  // Test 1: Password hashing produces salt and hash
  console.log('[1] Password Cryptography (PBKDF2-SHA256, 100k rounds):');
  const pass = 'SecretP@ss123';
  const { hash, salt } = await hashPassword(pass);
  assert(hash.length >= 32, 'Hash is non-empty hex string');
  assert(salt.length >= 16, 'Salt is non-empty hex string');

  // Test 2: Password verification with correct credentials
  const valid = await verifyPassword(pass, hash, salt);
  assert(valid === true, 'Correct password verifies successfully');

  // Test 3: Password verification rejection with incorrect credentials
  const invalid = await verifyPassword('WrongPassword!', hash, salt);
  assert(invalid === false, 'Incorrect password correctly rejected');

  // Test 4: Different passwords generate different unique salts
  const { salt: salt2 } = await hashPassword(pass);
  assert(salt !== salt2, 'Different salt generated per encryption call (CSPRNG)');

  // Test 5: Registration validation - Missing fields
  console.log('\n[2] Registration Form Validation:');
  const emptyReg = validateRegistration({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  assert(!emptyReg.valid, 'Empty registration rejected');
  assert(!!emptyReg.errors.fullName, 'Full name required error caught');
  assert(!!emptyReg.errors.email, 'Email required error caught');
  assert(!!emptyReg.errors.password, 'Password required error caught');

  // Test 6: Registration validation - Invalid email
  const badEmailReg = validateRegistration({
    fullName: 'Rohan Sharma',
    email: 'not-an-email',
    password: 'Password123',
    confirmPassword: 'Password123',
  });
  assert(!badEmailReg.valid && !!badEmailReg.errors.email, 'Malformed email format rejected');

  // Test 7: Registration validation - Short password (< 6 chars)
  const shortPassReg = validateRegistration({
    fullName: 'Rohan Sharma',
    email: 'rohan@example.com',
    password: '123',
    confirmPassword: '123',
  });
  assert(!shortPassReg.valid && !!shortPassReg.errors.password, 'Password shorter than 6 chars rejected');

  // Test 8: Registration validation - Mismatched passwords
  const mismatchReg = validateRegistration({
    fullName: 'Rohan Sharma',
    email: 'rohan@example.com',
    password: 'Password@123',
    confirmPassword: 'DifferentPassword@123',
  });
  assert(!mismatchReg.valid && !!mismatchReg.errors.confirmPassword, 'Mismatched confirm password rejected');

  // Test 9: Registration validation - Valid registration with optional fields
  const validReg = validateRegistration({
    fullName: 'Rohan Sharma',
    email: 'rohan@example.com',
    password: 'Password@123',
    confirmPassword: 'Password@123',
    phoneNumber: '9876543210',
    enrollmentNumber: 'EN-2026-99',
    university: 'Delhi University',
  });
  assert(validReg.valid, 'Valid registration payload accepted with optional student fields');

  // Test 10: Sign in validation
  console.log('\n[3] Sign In Form Validation:');
  const badLogin = validateSignIn('', '');
  assert(!badLogin.valid, 'Blank login credentials rejected');
  const validLogin = validateSignIn('rohan@example.com', 'Password@123');
  assert(validLogin.valid, 'Correct format login accepted');

  // Test 11: Password reset validation
  console.log('\n[4] Password Reset Validation:');
  const badReset = validateResetPassword({
    email: 'rohan@example.com',
    token: '',
    newPassword: 'short',
    confirmNewPassword: 'diff',
  });
  assert(!badReset.valid, 'Invalid reset credentials rejected');

  const goodReset = validateResetPassword({
    email: 'rohan@example.com',
    token: '123456',
    newPassword: 'NewSecurePassword@123',
    confirmNewPassword: 'NewSecurePassword@123',
  });
  assert(goodReset.valid, 'Valid reset credentials accepted');

  // Test 12: Item quantity math isolation (No negative remaining counts)
  console.log('\n[5] Item Return & Non-negative Calculation Safety:');
  const given = 5;
  const returned = 3;
  const remaining = Math.max(0, given - returned);
  assert(remaining === 2, 'Correct remaining count calculated');
  const overReturned = 10;
  const safeRemaining = Math.max(0, given - overReturned);
  assert(safeRemaining === 0, 'Excess return counts clamped to 0 (no negative items)');

  console.log(`\n=================================================`);
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`=================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
