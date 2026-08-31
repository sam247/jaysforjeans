import type { MetadataRoute } from "next";

const baseUrl = "https://jaysforjeans.co.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/how-to-play", "/high-scores", "/about", "/privacy"].map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: path === "" || path === "/high-scores" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/privacy" ? 0.3 : 0.7,
  }));
}
