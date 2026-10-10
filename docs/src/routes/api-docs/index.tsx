import style from '../embed.module.css';

// The Typedoc output is built into /api/ of this site - see docs/typedoc.json
const APIDocs = () => (
	<iframe class={style.embed} title="API documentation" src={`${import.meta.env.BASE_URL}api/`} />
);

export default APIDocs;
