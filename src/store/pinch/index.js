import { getComponentsSizes, checkZoomBounds } from "../zoom/utils";
import { handleCalculatePositions } from "../zoom";
import { getDistance, calculateBoundingArea } from "../utils";

function round(number, decimal) {
  const roundNumber = Math.pow(10, decimal);
  return Math.round(number * roundNumber) / roundNumber;
}

function getCurrentDistance(event) {
  return getDistance(event.touches[0], event.touches[1]);
}

function checkIfInfinite(number) {
  return number === Infinity || number === -Infinity;
}

export function calculatePinchZoom(currentDistance, pinchStartDistance) {
  const { minScale, maxScale, scaleAnimationPadding } = this.stateProvider;
  if (typeof pinchStartDistance !== "number" || typeof currentDistance !== "number")
    return console.error("Pinch touches distance was not provided");

  if (currentDistance < 0) return;
  const touchProportion = currentDistance / pinchStartDistance;
  const scaleDifference = touchProportion * this.pinchStartScale;

  return checkZoomBounds(scaleDifference, minScale, maxScale, scaleAnimationPadding);
}

export function calculateMidpoint(event, scale, contentComponent) {
  const contentRect = contentComponent.getBoundingClientRect();
  const { touches } = event;
  const firstPointX = round(touches[0].clientX - contentRect.left, 5);
  const firstPointY = round(touches[0].clientY - contentRect.top, 5);
  const secondPointX = round(touches[1].clientX - contentRect.left, 5);
  const secondPointY = round(touches[1].clientY - contentRect.top, 5);

  return {
    mouseX: (firstPointX + secondPointX) / 2 / scale,
    mouseY: (firstPointY + secondPointY) / 2 / scale,
  };
}

export function handleZoomPinch(event) {
  const {
    isDown,
    zoomingEnabled,
    disabled,
    scale,
    limitToWrapperBounds,
    limitToBounds,
  } = this.stateProvider;
  const { wrapperComponent, contentComponent } = this.state;
  if (isDown || !zoomingEnabled || disabled) return;

  if (event.cancelable) {
    event.preventDefault();
    event.stopPropagation();
  }

  // if one finger starts from outside of wrapper
  if (this.pinchStartDistance === null) return;

  // Position transformation
  const { mouseX, mouseY } = calculateMidpoint(event, scale, contentComponent);

  // if touches goes off of the wrapper element
  if (checkIfInfinite(mouseX) || checkIfInfinite(mouseY)) return;

  const currentDistance = getCurrentDistance(event);

  const newScale = calculatePinchZoom.bind(this, currentDistance, this.pinchStartDistance)();
  if (checkIfInfinite(newScale) || newScale === scale) return;

  // Get new element sizes to calculate bounds
  const {
    wrapperWidth,
    wrapperHeight,
    newContentWidth,
    newDiffWidth,
    newContentHeight,
    newDiffHeight,
  } = getComponentsSizes(wrapperComponent, newScale);

  const bounds = calculateBoundingArea(
    wrapperWidth,
    newContentWidth,
    newDiffWidth,
    wrapperHeight,
    newContentHeight,
    newDiffHeight,
    limitToWrapperBounds
  );

  // Calculate transformations
  const { x, y } = handleCalculatePositions.bind(
    this,
    mouseX,
    mouseY,
    newScale,
    bounds,
    limitToBounds
  );

  this.lastDistance = currentDistance;

  this.stateProvider = {
    ...this.stateProvider,
    positionX: x,
    positionY: y,
    scale: newScale,
    previousScale: scale,
  };
  // update component transformation
  this.setContentComponentTransformation();
}