import { TerraDrawMarkerMode } from 'terra-draw';
import { AllStories } from '../../common/stories';
import { DefaultMeta } from '../../common/meta';
import { SetupCesium } from './setup';
import markerPng from './assets/marker.png';
import markerJpg from './assets/marker.jpg';

const meta = {
	...DefaultMeta,
	title: 'Terra Draw/Cesium',
	tags: ['cesium'],
	render: SetupCesium
};

export default meta;

// Ensure the names are set correctly for the stories
export const Point = AllStories.Point;

// Cesium loads billboard images as WebGL textures, which requires CORS-enabled
// image hosts, so the marker stories use locally served images instead of the
// upstream external URLs
export const MarkerPNG = {
	...AllStories.MarkerPNG,
	args: {
		...AllStories.MarkerPNG.args!,
		modes: [
			() =>
				new TerraDrawMarkerMode({
					styles: {
						markerUrl: markerPng,
						markerWidth: 24,
						markerHeight: 40
					}
				})
		]
	}
};
export const MarkerJPG = {
	...AllStories.MarkerJPG,
	args: {
		...AllStories.MarkerJPG.args!,
		modes: [
			() =>
				new TerraDrawMarkerMode({
					styles: {
						markerUrl: markerJpg,
						markerWidth: 24,
						markerHeight: 40
					}
				})
		]
	}
};
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
