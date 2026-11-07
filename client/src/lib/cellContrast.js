const luminance = (color) => {
  let hex = String(color || '').replace(/^#/, '');
  if (hex.length === 3) hex = [...hex].map((value) => value.repeat(2)).join('');
  if (!/^[\da-f]{6}$/i.test(hex)) return null;
  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

export const getCellLabelStyle = (colors = []) => {
  if (!colors.length) return undefined;
  const values = colors.map(luminance);
  if (values.some((value) => value === null)) return { color: '#fff', backgroundColor: '#0f172a' };
  const dark = Math.min(...values.map((value) => (value + 0.05) / 0.05));
  const light = Math.min(...values.map((value) => 1.05 / (value + 0.05)));
  if (Math.max(dark, light) < 4.5) return { color: '#fff', backgroundColor: '#0f172a' };
  return { color: dark >= light ? '#000' : '#fff' };
};
