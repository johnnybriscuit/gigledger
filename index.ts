// Import polyfills FIRST to prevent web 500 errors
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

// Some native runtimes end up with a global Promise implementation missing
// newer methods (e.g. allSettled). Polyfill defensively rather than relying
// on whichever Promise ends up installed.
if (typeof Promise.allSettled !== 'function') {
  Promise.allSettled = function allSettled(promises: Array<Promise<any>>) {
    return Promise.all(
      Array.from(promises).map((p) =>
        Promise.resolve(p).then(
          (value) => ({ status: 'fulfilled' as const, value }),
          (reason) => ({ status: 'rejected' as const, reason })
        )
      )
    );
  };
}

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
