import Header from './header/Header';
import { useHashRoute } from './use-hash-route';
import Home from '../routes/home';
import APIDocs from '../routes/api-docs';
import Storybook from '../routes/storybook';

const App = () => {
	const route = useHashRoute();

	return (
		<div id="app">
			<Header route={route} />
			{route === '/api' ? <APIDocs /> : route === '/storybook' ? <Storybook /> : <Home />}
		</div>
	);
};

export default App;
