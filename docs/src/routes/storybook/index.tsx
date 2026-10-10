import style from '../embed.module.css';

// The built Storybook is copied into /storybook/ of this site - see docs/scripts/bundle.mjs
const Storybook = () => (
	<iframe class={style.embed} title="Storybook" src={`${import.meta.env.BASE_URL}storybook/`} />
);

export default Storybook;
