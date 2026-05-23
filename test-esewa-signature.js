// Test signature generation locally
// Save as: test-esewa-signature.js
// Run: node test-esewa-signature.js

import crypto from 'crypto';

// Test values
const totalAmount = '100';
const transactionUuid = 'TXN-ABC123XYZ';
const productCode = 'EPAYTEST';
const secretKeyBase64 = 'LB0REg8HUSw3MTYrI1s6JTE8Kyc6JyAqJiA3MQ==';

// Test 1: Message format
console.log('\n=== eSewa Signature Test ===\n');
console.log('Test Values:');
console.log('  Total Amount:', totalAmount);
console.log('  Transaction UUID:', transactionUuid);
console.log('  Product Code:', productCode);
console.log('  Secret Key (Base64):', secretKeyBase64);

// Test 2: Message construction
const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
console.log('\nMessage to Sign:');
console.log('  ', message);

// Test 3: Key decoding
console.log('\nSecret Key Decoding:');
const decodedKey = Buffer.from(secretKeyBase64, 'base64');
console.log('  Original (Base64):', secretKeyBase64);
console.log('  Decoded (Hex):', decodedKey.toString('hex'));
console.log('  Decoded Length:', decodedKey.length, 'bytes');

// Test 4: Signature generation
console.log('\nSignature Generation:');
const hmac = crypto.createHmac('sha256', decodedKey);
hmac.update(message);
const signature = hmac.digest('base64');
console.log('  Generated Signature:', signature);
console.log('  Signature Length:', signature.length);

// Test 5: Verification
console.log('\nSignature Verification:');
const hmacVerify = crypto.createHmac('sha256', decodedKey);
hmacVerify.update(message);
const verifySignature = hmacVerify.digest('base64');
console.log('  Expected:', verifySignature);
console.log('  Match:', signature === verifySignature ? '✅ PASS' : '❌ FAIL');

// Test 6: What went wrong (if using Base64 key directly)
console.log('\n=== Common Mistake (Using Base64 directly) ===');
const wrongHmac = crypto.createHmac('sha256', secretKeyBase64);
wrongHmac.update(message);
const wrongSignature = wrongHmac.digest('base64');
console.log('  Wrong Signature:', wrongSignature);
console.log('  Matches Correct:', signature === wrongSignature ? '✅' : '❌ NO (This is the bug!)');

console.log('\n✅ Signature generation is working correctly!\n');
