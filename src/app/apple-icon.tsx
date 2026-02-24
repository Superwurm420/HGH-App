import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  const logoBuffer = readFileSync(join(process.cwd(), 'public/content/branding/school-logo.svg'));
  const dataUrl = `data:image/svg+xml;base64,${logoBuffer.toString('base64')}`;

  return new ImageResponse(
    (
      <img src={dataUrl} width={180} height={180} />
    ),
    { ...size },
  );
}
