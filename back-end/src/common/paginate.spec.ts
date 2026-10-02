import { paginate } from './paginate';

describe('paginate', () => {
  it('returns 1 page (not 0) when there are no items', () => {
    const result = paginate([], 0, 1, 10);

    expect(result).toEqual({ items: [], total: 0, page: 1, pages: 1 });
  });

  it('rounds up to include a partial final page', () => {
    const result = paginate(['a', 'b', 'c'], 23, 2, 10);

    expect(result.pages).toBe(3);
  });

  it('does not add an extra page when total divides evenly by limit', () => {
    const result = paginate(['a'], 20, 1, 10);

    expect(result.pages).toBe(2);
  });

  it('passes items, total, and page through unchanged', () => {
    const items = [{ id: 1 }, { id: 2 }];

    const result = paginate(items, 2, 3, 5);

    expect(result.items).toBe(items);
    expect(result.total).toBe(2);
    expect(result.page).toBe(3);
  });
});
