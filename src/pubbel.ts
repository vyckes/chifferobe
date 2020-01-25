import { Subscription, PubSub, List, Primitive } from './types';
import { uuid } from './utils';

// Helper for synchronizing through localStorage
function synchronize(message: string, ...args: Primitive[]): void {
  localStorage.setItem('pubbel-event', JSON.stringify({ message, args }));
  localStorage.removeItem('pubbel-event');
}

// The actual pubsub
export default function pubbel(): PubSub {
  const _id: string = uuid();
  const _list: List = new Map<string, Subscription[]>();
  const get = (message: string): Subscription[] => _list.get(message) || [];
  const set = (msg: string, subs: Subscription[]): void => {
    if (subs.length > 0) _list.set(msg, subs);
    else _list.delete(msg);
  };

  // Publish the message and optionally sync it
  function publish(message: string, sync: boolean, ...args: Primitive[]): void {
    _list.get(message)?.forEach((sub): void => sub.callback?.(...args));
    if (sync) synchronize(message, ...args);
  }

  window.addEventListener('storage', function({ key, newValue }) {
    if (key !== 'pubbel-event' || !newValue) return;
    const data = JSON.parse(newValue);
    if (!_list.has(data.message)) return;

    publish(data.message, false, ...(data.args || []));
  });

  return {
    get id(): string {
      return _id;
    },
    // publish a message onto the pubsub with optional additional parameters
    publish(message, ...args): void {
      publish(message, true, ...args);
    },
    // Subscribe a callback to a message, that also can be removed
    subscribe(message, callback): Subscription {
      const id = uuid();
      const sub: Subscription = {
        id,
        callback,
        remove(): void {
          const rem = get(message).filter((s) => s.id !== id);
          set(message, rem);
        }
      };
      set(message, get(message).concat(sub));
      return sub;
    },
    // remove an entire message from the list
    remove(message): void {
      _list.has(message) && _list.delete(message);
    }
  };
}
