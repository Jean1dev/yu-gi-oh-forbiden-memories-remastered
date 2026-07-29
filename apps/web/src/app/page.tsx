import { MainMenu } from "../components/menu/main-menu.tsx";

/**
 * Static app shell, cacheable by the service worker (ADR-004). The menu itself
 * depends on the authenticated player, which the browser client resolves from
 * local storage, so nothing is pre-rendered here.
 */
export default function HomePage() {
  return <MainMenu />;
}
