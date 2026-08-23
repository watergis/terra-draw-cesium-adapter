import {
	TerraDrawLineStringMode,
	TerraDrawPointMode,
	TerraDrawPolygonMode,
	TerraDrawSelectMode
} from 'terra-draw';
import { AllStories } from '../../common/stories';
import { DefaultMeta } from '../../common/meta';
import { DefaultPlay, DefaultSize, LocationMountFuji, type Story } from '../../common/config';
import { SetupCesium } from './setup';

const meta = {
	...DefaultMeta,
	title: 'Terra Draw/Cesium',
	tags: ['cesium'],
	render: SetupCesium
};

export default meta;

// Ensure the names are set correctly for the stories
export const Point = AllStories.Point;
export const MarkerPNG = AllStories.MarkerPNG;
export const MarkerJPG = AllStories.MarkerJPG;
export const Opacity = AllStories.Opacity;
export const Polygon = AllStories.Polygon;
export const PolygonWithCoordinatePoints = AllStories.PolygonWithCoordinatePoints;
export const PolygonWithCoordinateSnapping = AllStories.PolygonWithCoordinateSnapping;
export const PolygonWithLineSnapping = AllStories.PolygonWithLineSnapping;
export const PolygonWithSnapToFeature = AllStories.PolygonWithSnapToFeature;
export const PolygonWithEditableEnabled = AllStories.PolygonWithEditableEnabled;
export const PolygonWithCoordinateCounts = AllStories.PolygonWithCoordinateCounts;
export const ZIndexOrdering = AllStories.ZIndexOrdering;
export const Styling = AllStories.Styling;
export const Circle = AllStories.Circle;
export const CircleWithClickDragInteraction = AllStories.CircleWithClickDragInteraction;
export const CircleWithClickMoveOrDragInteraction = AllStories.CircleWithClickMoveOrDragInteraction;
export const Rectangle = AllStories.Rectangle;
export const RectangleWithClickDragInteraction = AllStories.RectangleWithClickDragInteraction;
export const RectangleWithClickMoveOrDragInteraction =
	AllStories.RectangleWithClickMoveOrDragInteraction;
export const AngledRectangle = AllStories.AngledRectangle;
export const Sector = AllStories.Sector;
export const PolyLine = AllStories.PolyLine;
export const LineString = AllStories.LineString;
export const LineStringFinishOnNthCoordinate = AllStories.LineStringFinishOnNthCoordinate;
export const LineStringWithCoordinateSnapping = AllStories.LineStringWithCoordinateSnapping;
export const LineStringWithLineSnapping = AllStories.LineStringWithLineSnapping;
export const LineStringEditable = AllStories.LineStringEditable;
export const LineStringWithCoordinatePoints = AllStories.LineStringWithCoordinatePoints;
export const FreehandLineString = AllStories.FreehandLineString;
export const Freehand = AllStories.Freehand;
export const FreehandWithAutoClose = AllStories.FreehandWithAutoClose;
export const FreehandWithSmoothing = AllStories.FreehandWithSmoothing;
export const Sensor = AllStories.Sensor;
export const Select = AllStories.Select;
export const SelectWithSelectionPoints = AllStories.SelectWithSelectionPoints;
export const SelectWithMidPoints = AllStories.SelectWithMidPoints;
export const SelectWithMultipleOfSameModes = AllStories.SelectWithMultipleOfSameModes;
export const SelectWithMultipleSelectModes = AllStories.SelectWithMultipleSelectModes;
export const SelectWithScaleAndRotate = AllStories.SelectWithScaleAndRotate;
export const SelectWithResizable = AllStories.SelectWithResizable;
export const SelectWithHoverCursors = AllStories.SelectWithHoverCursors;
export const ProgrammaticRotate = AllStories.ProgrammaticRotate;
export const ProgrammaticScale = AllStories.ProgrammaticScale;
export const ProgrammaticUpdate = AllStories.ProgrammaticUpdate;
export const UndoRedo = AllStories.UndoRedo;

/**
 * Cesium is the only adapter with a tiltable camera and real terrain, so this
 * story has no counterpart in the shared set. Drawing on the slopes of Mount
 * Fuji from a tilted camera is what catches the picking surface being the
 * ellipsoid rather than the terrain - the two agree only when looking straight
 * down. Needs a Cesium Ion access token, see packages/storybook/.env.example;
 * without one it falls back to the offline flat globe of the other stories.
 */
export const TerrainTilted: Story = {
	...DefaultPlay,
	args: {
		...DefaultSize,
		...LocationMountFuji,
		id: 'terrain-tilted',
		zoom: 13,
		pitch: -45,
		terrain: true,
		instructions:
			'Draw on the slopes with the camera tilted - each coordinate should land where it was clicked',
		modes: [
			() => new TerraDrawPointMode(),
			() => new TerraDrawLineStringMode(),
			() => new TerraDrawPolygonMode({ showCoordinatePoints: true }),
			() =>
				new TerraDrawSelectMode({
					flags: {
						point: { feature: { draggable: true } },
						linestring: { feature: { draggable: true, coordinates: { draggable: true } } },
						polygon: { feature: { draggable: true, coordinates: { draggable: true } } }
					}
				})
		]
	}
};
