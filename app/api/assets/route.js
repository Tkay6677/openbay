import { assets } from "../../../lib/sampleData";

export async function GET() {
  return new Response(JSON.stringify({ assets }), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}