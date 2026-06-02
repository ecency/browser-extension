import schemas, {
  commonRequestParams,
} from 'src/content-scripts/web-interface/input-validation';

// Mirrors validateRequest() in
// src/content-scripts/web-interface/index.ts so these tests exercise exactly
// what the content script runs against incoming dApp requests.
const validate = (req: any) =>
  (schemas as any)[req.type].append(commonRequestParams).validate(req);

const baseTransfer = {
  request_id: 1,
  type: 'transfer',
  username: 'alice',
  to: 'bob',
  amount: '1.000',
  currency: 'HIVE',
  memo: '',
};

describe('content-script request validation', () => {
  it('accepts a request carrying the discovery-protocol extension_id', () => {
    // Regression: hive.js stamps `extension_id: 'keeper'` on every request.
    // Before whitelisting it, this failed with
    // `ValidationError: "extension_id" is not allowed`.
    const { error } = validate({ ...baseTransfer, extension_id: 'keeper' });
    expect(error).toBeUndefined();
  });

  it('still accepts a legacy request with no extension_id', () => {
    const { error } = validate({ ...baseTransfer });
    expect(error).toBeUndefined();
  });

  it('still rejects genuinely unknown keys', () => {
    // The whitelist must stay tight — only the known envelope fields are
    // allowed, not arbitrary extras.
    const { error } = validate({ ...baseTransfer, not_a_real_field: 'x' });
    expect(error).toBeDefined();
    expect(error?.message).toContain('not_a_real_field');
  });
});
