import { ApiError, get, post, setUnauthorizedHandler, tokenStore } from '../api/client';

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

afterEach(() => { vi.unstubAllGlobals(); tokenStore.clear(); });

describe('api client', () => {
  it('sends the bearer token and JSON body', async () => {
    tokenStore.set('abc', true);
    const f = respond(200, { data: 1 });
    vi.stubGlobal('fetch', f);
    await post('/x', { a: 1 });
    const [, init] = f.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer abc');
    expect(init.body).toBe('{"a":1}');
  });

  it('keeps a non-remembered token for this tab only', () => {
    tokenStore.set('tab', false);
    expect(sessionStorage.getItem('dara.business.token')).toBe('tab');
    expect(localStorage.getItem('dara.business.token')).toBeNull();
  });

  it('surfaces the first validation error', async () => {
    vi.stubGlobal('fetch', respond(422, { message: 'Invalid', errors: { email: ['Email is taken'] } }));
    await expect(get('/x')).rejects.toMatchObject({ message: 'Email is taken', status: 422 });
  });

  it('treats { status: false } on a 200 as an error', async () => {
    vi.stubGlobal('fetch', respond(200, { status: false, message: 'Wrong PIN' }));
    await expect(get('/x')).rejects.toThrow('Wrong PIN');
  });

  it('calls the unauthorized handler on 401', async () => {
    const h = vi.fn();
    setUnauthorizedHandler(h);
    vi.stubGlobal('fetch', respond(401, {}));
    await expect(get('/x')).rejects.toBeInstanceOf(ApiError);
    expect(h).toHaveBeenCalled();
  });

  it('gives a friendly message when offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(get('/x')).rejects.toMatchObject({ status: 0 });
  });
});
