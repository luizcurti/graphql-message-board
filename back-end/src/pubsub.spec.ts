import { PubSub } from 'graphql-subscriptions';
import { pubSub } from './pubsub';

describe('pubSub', () => {
  it('is a shared PubSub that delivers published events', async () => {
    expect(pubSub).toBeInstanceOf(PubSub);

    const iterator = pubSub.asyncIterator<{ n: number }>('test');
    const next = iterator.next();
    await pubSub.publish('test', { n: 1 });

    expect(await next).toEqual({ value: { n: 1 }, done: false });
    await iterator.return?.();
  });
});
