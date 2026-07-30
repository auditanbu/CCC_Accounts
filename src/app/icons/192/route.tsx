import { ImageResponse } from "next/og";

import { brandIconDataUri } from "@/lib/brand-icon";

export async function GET() {
  return new ImageResponse(<img width={192} height={192} src={brandIconDataUri()} />, {
    width: 192,
    height: 192,
  });
}
