import style from './style.module.css';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useRef, useEffect, useState, useCallback } from 'preact/hooks';
import type { Viewer } from 'cesium';
import { GeoJSONStoreFeatures, TerraDraw } from 'terra-draw';
import { setupDraw } from './setup-draw';
import { setLocation, setupCesiumViewer } from './setup-cesium';
import InfoTab from '../../components/info-tab/InfoTab';
import GeoJSONTab from '../../components/geojson-tab/GeoJSONTab';
import MapButtons from '../../components/map-buttons/MapButtons';
import { useLocalStorageStore } from './store-local-storage';
import { stripSnapshot } from './strip-snapshot';
import { PanelRightClose, PanelRightOpen } from 'lucide-preact';

const mapOptions = {
	lng: 0,
	lat: 30,
	// Camera height in metres, far enough out to frame the whole globe
	height: 20_000_000
};

const Home = () => {
	const ref = useRef<HTMLDivElement>(null);
	const [viewer, setViewer] = useState<undefined | Viewer>();
	const [mode, setMode] = useState<string>('static');
	const [action, setAction] = useState<string>('');
	const [canUndo, setCanUndo] = useState<boolean>(false);
	const [canRedo, setCanRedo] = useState<boolean>(false);

	const [expanded, setExpanded] = useState<boolean>(true);
	const [selected, setSelected] = useState<GeoJSONStoreFeatures | undefined>();
	const [features, setFeatures] = useState<GeoJSONStoreFeatures[]>([]);
	const [tab, setTabState] = useState<'info' | 'geojson'>(
		localStorage.getItem('tab') ? (localStorage.getItem('tab') as 'info' | 'geojson') : 'info'
	);
	const [format, setFormat] = useState<'geojson' | 'fgb'>('geojson');
	const [draw, setDraw] = useState<undefined | TerraDraw>();

	const setTab = (newTab: 'info' | 'geojson') => {
		setTabState(newTab);
		localStorage.setItem('tab', newTab);
	};

	const { clearLocalStorage, setLocalStorage, getLocalStorage } = useLocalStorageStore();

	useEffect(() => {
		if (!ref.current) {
			return;
		}

		// A Cesium Viewer is usable as soon as it is constructed, so unlike the
		// map libraries that need a load event Terra Draw can be started immediately
		const cesiumViewer = setupCesiumViewer({ container: ref.current, ...mapOptions });
		const terraDraw = setupDraw(cesiumViewer);
		terraDraw.start();

		setViewer(cesiumViewer);
		setDraw(terraDraw);

		// The viewer holds a WebGL context, so it has to be released when
		// navigating away to the API Docs or Storybook tabs
		return () => {
			terraDraw.stop();
			cesiumViewer.destroy();
		};
	}, []);

	const changeMode = useCallback(
		(newMode: string) => {
			if (draw) {
				setMode(newMode);
				draw.setMode(newMode);
			}
		},
		[draw]
	);

	const changeAction = useCallback(
		(newAction: string) => {
			if (draw && newAction) {
				setAction(newAction);

				if (newAction === 'undo') {
					draw.undo();
				} else if (newAction === 'redo') {
					draw.redo();
				} else {
					return null;
				}

				setCanUndo(draw.canUndo());
				setCanRedo(draw.canRedo());
			}
		},
		[draw]
	);

	const selectFeatureFromTable = useCallback(
		(featureId: string) => {
			if (!draw || !draw.hasFeature(featureId)) {
				return;
			}

			draw.setMode('select');
			setMode('select');
			draw.selectFeature(featureId, 'select');

			const snapshot = draw.getSnapshot();
			setFeatures(snapshot);
			setSelected(snapshot.find((feature) => feature.properties.selected));
		},
		[draw]
	);

	useEffect(() => {
		if (draw) {
			const syncUndoRedoState = () => {
				setCanUndo(draw.canUndo());
				setCanRedo(draw.canRedo());
			};

			const handleChange = () => {
				const snapshot = draw.getSnapshot();
				setFeatures(snapshot);
				setSelected(snapshot.find((f) => f.properties.selected));
				setLocalStorage(stripSnapshot(snapshot));
			};

			draw.on('change', handleChange);
			draw.on('history', syncUndoRedoState);

			const snapshot = getLocalStorage();
			if (snapshot) {
				const parsed = JSON.parse(snapshot);
				draw.addFeatures(parsed);
				draw.clearUndoRedoHistory();
			}

			syncUndoRedoState();

			return () => {
				draw.off('change', handleChange);
				draw.off('history', syncUndoRedoState);
			};
		}
	}, [getLocalStorage, setLocalStorage, draw]);

	return (
		<div class={style.home}>
			<div class={style.map}>
				{/* Cesium owns the contents of this element, so the buttons sit beside it rather than inside it */}
				<div ref={ref} class={style.cesium} id="cesium-map" />
				{draw ? (
					<MapButtons
						mode={mode}
						changeMode={changeMode}
						action={action}
						changeAction={changeAction}
						canUndo={canUndo}
						canRedo={canRedo}
						draw={draw}
						clearLocalStorage={clearLocalStorage}
						setFeatures={setFeatures}
						setLocation={(position) => {
							if (viewer) {
								setLocation(viewer, position);
							}
						}}
					/>
				) : null}
			</div>
			<div class={expanded ? style.expanded : style.collapsed}>
				<button
					class={style.collapse}
					title={expanded ? 'Collapse side panel' : 'Expand side panel'}
					aria-label={expanded ? 'Collapse side panel' : 'Expand side panel'}
					onClick={() => {
						setExpanded(!expanded);
					}}
				>
					{expanded ? (
						<PanelRightClose size={16} aria-hidden={true} />
					) : (
						<PanelRightOpen size={16} aria-hidden={true} />
					)}
				</button>
				<div id="sidepanel" class={expanded ? style.tabs : style.tabsHidden}>
					<div class={style.tabButtons}>
						<span
							class={tab === 'info' ? style.tabActive : style.tab}
							onClick={() => setTab('info')}
						>
							Info
						</span>
						<span
							class={tab === 'geojson' ? style.tabActive : style.tab}
							onClick={() => setTab('geojson')}
						>
							GeoJSON
						</span>
					</div>

					{tab === 'info' ? (
						<InfoTab
							selected={selected}
							features={features}
							onSelectFeature={selectFeatureFromTable}
						/>
					) : (
						<GeoJSONTab
							features={features}
							format={format}
							setFormat={(newFormat: 'geojson' | 'fgb') => setFormat(newFormat)}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export default Home;
