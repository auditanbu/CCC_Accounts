import { ImageResponse } from "next/og";

import { brandIconDataUri } from "@/lib/brand-icon";

export async function GET() {
  return new ImageResponse(<img width={512} height={512} src={brandIconDataUri()} />, {
    width: 512,
    height: 512,
  });
}
