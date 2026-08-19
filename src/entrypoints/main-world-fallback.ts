import { installMainWorld } from '@/main-world';

/**
 * Same payload as the declarative MAIN-world script, standalone so the isolated
 * script can inject it where declarative MAIN-world injection is unavailable.
 * `installMainWorld` is idempotent, so both paths running is harmless.
 */
export default defineUnlistedScript(() => {
  installMainWorld();
});
