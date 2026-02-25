/* eslint-disable @next/next/no-img-element -- next/og ImageResponse requires plain <img>, not Next.js <Image /> */
import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

const SIZE = 192;

export async function GET() {
  const logoBuffer = readFileSync(join(process.cwd(), 'public/content/branding/school-logo.svg'));
  const dataUrl = `data:image/svg+xml;base64,${logoBuffer.toString('base64')}`;

  return new ImageResponse(
    (
      <img src={dataUrl} width={SIZE} height={SIZE} alt="" />
    ),
    { width: SIZE, height: SIZE },
  );
}
