/**
 * This website is adapted from terra-draw-website
 * (https://github.com/JamesLMilner/terra-draw-website)
 * MIT License, Copyright (c) James Milner
 */
import './style/index.css';
import { render } from 'preact';
import App from './components/app';

render(<App />, document.getElementById('app') as HTMLElement);
