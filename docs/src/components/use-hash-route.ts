import { useEffect, useState } from 'preact/hooks';

// The site is routed on the URL hash, so that the /api/ and /storybook/ paths
// stay free for the static sites bundled alongside it
const currentRoute = () => window.location.hash.replace(/^#/, '').replace(/\/+$/, '') || '/';

export function useHashRoute() {
	const [route, setRoute] = useState(currentRoute);

	useEffect(() => {
		const onHashChange = () => setRoute(currentRoute());
		window.addEventListener('hashchange', onHashChange);
		return () => window.removeEventListener('hashchange', onHashChange);
	}, []);

	return route;
}
