import { ReactZoomPanPinchContext } from "../../models";
import { handleCallback } from "../../utils/callback.utils";
import { getContext } from "../../utils/context.utils";
import { cancelTimeout } from "../../utils/helpers.utils";
import { handleCancelAnimation } from "../animations/animations.utils";
import { handleCalculateBounds } from "../bounds/bounds.utils";
import {
  getDelta,
  handleCalculateWheelZoom,
  handleWheelZoomStop,
  getMousePosition,
} from "./wheel.utils";
import { handleAlignToScaleBounds } from "./zoom.logic";
import { handleCalculateZoomPositions } from "./zoom.utils";

const wheelStopEventTime = 160;
const wheelAnimationTime = 100;

export const handleWheelStart = (
  contextInstance: ReactZoomPanPinchContext,
): void => {
  const { onWheelStart, onZoomStart } = contextInstance.props;

  if (!contextInstance.wheelStopEventTimer) {
    handleCancelAnimation(contextInstance);
    handleCallback(getContext(contextInstance), onWheelStart);
    handleCallback(getContext(contextInstance), onZoomStart);
  }
};

export const handleWheelZoom = (
  contextInstance: ReactZoomPanPinchContext,
  event: WheelEvent,
): void => {
  const { onWheel, onZoom } = contextInstance.props;

  const { contentComponent, setup, transformState } = contextInstance;
  const { scale } = transformState;
  const { limitToBounds, centerZoomedOut, zoomAnimation, wheel } = setup;
  const { size, disabled } = zoomAnimation;
  const { step } = wheel;

  if (!contentComponent) {
    throw new Error("Component not mounted");
  }

  event.preventDefault();
  event.stopPropagation();

  const delta = getDelta(event, null);
  const newScale = handleCalculateWheelZoom(
    contextInstance,
    delta,
    step,
    !event.ctrlKey,
  );

  // if scale not change
  if (scale === newScale) return;

  const bounds = handleCalculateBounds(contextInstance, newScale);
  const mousePosition = getMousePosition(event, contentComponent, scale);

  const isPaddingDisabled = disabled || size === 0 || centerZoomedOut;
  const isLimitedToBounds = limitToBounds && isPaddingDisabled;

  const { x, y } = handleCalculateZoomPositions(
    contextInstance,
    mousePosition.x,
    mousePosition.y,
    newScale,
    bounds,
    isLimitedToBounds,
  );

  contextInstance.previousWheelEvent = event;
  contextInstance.transformState.previousScale = scale;
  contextInstance.transformState.scale = newScale;
  contextInstance.transformState.positionX = x;
  contextInstance.transformState.positionY = y;
  contextInstance.applyTransformation();

  handleCallback(getContext(contextInstance), onWheel);
  handleCallback(getContext(contextInstance), onZoom);
};

export const handleWheelStop = (
  contextInstance: ReactZoomPanPinchContext,
  event: WheelEvent,
): void => {
  const { onWheelStop, onZoomStop } = contextInstance.props;

  // fire animation
  cancelTimeout(contextInstance.wheelAnimationTimer);
  contextInstance.wheelAnimationTimer = setTimeout(() => {
    if (!contextInstance.mounted) return;
    handleAlignToScaleBounds(contextInstance, event);
    contextInstance.wheelAnimationTimer = null;
  }, wheelAnimationTime);

  // Wheel stop event
  const hasStoppedZooming = handleWheelZoomStop(contextInstance, event);
  if (hasStoppedZooming) {
    cancelTimeout(contextInstance.wheelStopEventTimer);
    contextInstance.wheelStopEventTimer = setTimeout(() => {
      if (!contextInstance.mounted) return;
      contextInstance.wheelStopEventTimer = null;
      handleCallback(getContext(contextInstance), onWheelStop);
      handleCallback(getContext(contextInstance), onZoomStop);
    }, wheelStopEventTime);
  }
};