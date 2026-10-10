import style from './style.module.css';
import logo from '../../assets/imgs/logo.png';
import { ExternalLink, Heart } from 'lucide-preact';

const repository = 'https://github.com/watergis/terra-draw-cesium-adapter';

const links = [
	{ href: '/', label: 'Home' },
	{ href: '/api', label: 'API Docs' },
	{ href: '/storybook', label: 'Storybook' }
];

const Header = ({ route }: { route: string }) => (
	<header class={style.header}>
		<div class={style.nav}>
			<a class={style.logoLink} href="#/" aria-label="Terra Draw Cesium Adapter">
				<img class={style.logo} src={logo} alt="Terra Draw Logo" />
				<span class={style.logoSuffix}>Cesium</span>
			</a>
			<nav>
				{links.map(({ href, label }) => (
					<a
						key={href}
						class={`${style.routeLink} ${route === href ? style.active : ''}`}
						href={`#${href}`}
					>
						{label}
					</a>
				))}
				<span class={style.navDivider} aria-hidden={true} />
				<a
					class={style.externalLink}
					href="https://github.com/JamesLMilner/terra-draw/blob/main/guides/1.GETTING_STARTED.md"
					target="_blank"
					rel="noopener noreferrer"
					title="Getting Started guide (opens in new tab)"
					aria-label="Getting Started guide (opens in new tab)"
				>
					<span>Getting Started</span>
					<ExternalLink size={14} strokeWidth={2.25} aria-hidden={true} />
				</a>
			</nav>
		</div>
		<div class={style.github}>
			<a href={repository} title="View on GitHub" aria-label="View on GitHub">
				<svg class={style.githubIcon} viewBox="0 0 16 16" aria-hidden={true}>
					<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
				</svg>
			</a>
			<a
				class={style.sponsorButton}
				href="https://github.com/sponsors/watergis"
				title="Sponsor on GitHub"
				aria-label="Sponsor on GitHub"
				target="_blank"
				rel="noreferrer"
			>
				<Heart
					class={style.sponsorHeart}
					size={14}
					strokeWidth={2.3}
					fill="currentColor"
					aria-hidden={true}
				/>
				Sponsor
			</a>
		</div>
	</header>
);

export default Header;
