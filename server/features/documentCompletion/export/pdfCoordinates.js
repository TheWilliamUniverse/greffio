/** PDF native coords: origin bottom-left, y increases upward. */
export const PDF_COORDS_BOTTOM_LEFT = 'pdf_points_bottom_left';

/** Legacy coords from early builds: origin top-left. */
export const PDF_COORDS_TOP_LEFT = 'pdf_points';

export const toPdfLibBottomLeftBbox = (bbox, pageWidth, pageHeight) => {
  const width = Math.max(1, Number(bbox.width || 0));
  const height = Math.max(1, Number(bbox.height || 0));
  const x = Number(bbox.x || 0);
  const y = Number(bbox.y || 0);
  const system = bbox.coordinateSystem || PDF_COORDS_BOTTOM_LEFT;

  if (system === PDF_COORDS_TOP_LEFT) {
    return {
      x,
      y: pageHeight - y - height,
      width,
      height,
    };
  }

  return { x, y, width, height };
};

export const isBboxOnPage = (bbox, pageWidth, pageHeight, tolerance = 2) => {
  if (!bbox) return false;
  const { x, y, width, height } = bbox;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return false;
  }
  if (width <= 0 || height <= 0) return false;
  if (x < -tolerance || y < -tolerance) return false;
  if (x + width > pageWidth + tolerance) return false;
  if (y + height > pageHeight + tolerance) return false;
  return true;
};

export const clampBboxToPage = (bbox, pageWidth, pageHeight, minWidth = 12, minHeight = 10) => {
  const system = bbox?.coordinateSystem || PDF_COORDS_BOTTOM_LEFT;
  let x = Number(bbox?.x || 0);
  let y = Number(bbox?.y || 0);
  let width = Math.max(minWidth, Number(bbox?.width || minWidth));
  let height = Math.max(minHeight, Number(bbox?.height || minHeight));

  if (x < 0) {
    width += x;
    x = 0;
  }
  if (y < 0) {
    height += y;
    y = 0;
  }
  if (x + width > pageWidth) width = Math.max(minWidth, pageWidth - x);
  if (y + height > pageHeight) height = Math.max(minHeight, pageHeight - y);

  return {
    x,
    y,
    width,
    height,
    coordinateSystem: system,
  };
};
