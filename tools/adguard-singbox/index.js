"use strict";

const { resolve, join, dirname } = require("path");
const fs = require("fs-extra");
const axios = require("axios");
const { execSync } = require("child_process");

// Output directory: ../../dist/sing-box
const distDir = resolve(__dirname, "..", "..", "dist", "sing-box");
const tmpDir = resolve(__dirname, "tmp");

const sources = [
  {
    name: "adguard-dns-filter",
    url: "https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt",
  },
  { name: "anti-ad",
    url: "https://anti-ad.net/adguard.txt" },
  {
    name: "adguard-chinese-filter",
    url: "https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_224_Chinese/filter.txt",
  },
  {
    name: "adguard-base-filter",
    url: "https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_2_Base/filter.txt",
  },
  {
    name: "adguard-tracking-protection-filter",
    url: "https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_3_Spyware/filter.txt",
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function downloadFile(url, dest, retries = 5, backoff = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Downloading ${url}...`);
      const response = await axios.get(url, { responseType: "arraybuffer" });
      await fs.writeFile(dest, response.data);
      return true;
    } catch (error) {
      console.error(`Error downloading ${url} (attempt ${attempt}/${retries}):`, error.message);
      if (attempt === retries) {
        return false;
      }
      const wait = backoff * attempt;
      console.warn(`Retrying in ${wait}ms...`);
      await sleep(wait);
    }
  }
  return false;
}

const singBoxBin = "sing-box";

async function convertRule(sourceName, inputPath) {
  const srsFileName = `${sourceName}.srs`;
  const outputPath = join(distDir, srsFileName);

  try {
    console.log(`Converting ${sourceName} to ${srsFileName}...`);
    // sing-box rule-set convert "input" --output "output" --type adguard
    execSync(`${singBoxBin} rule-set convert "${inputPath}" --output "${outputPath}" --type adguard`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Error converting ${sourceName}:`, error.message);
    return false;
  }
}

async function main() {
  await fs.ensureDir(distDir);
  await fs.ensureDir(tmpDir);

  // Clean up only the files this tool generates.
  // Do NOT emptyDir the whole dist/sing-box/ directory — other tools
  // (e.g. urlhaus-singbox) write here too, and would lose their output.
  for (const source of sources) {
    await fs.remove(join(distDir, `${source.name}.srs`));
  }

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const inputPath = join(tmpDir, `${source.name}.txt`);

    const downloaded = await downloadFile(source.url, inputPath);
    if (downloaded) {
      await convertRule(source.name, inputPath);
    }
    // Throttle between requests to avoid GitHub raw 429 rate limiting
    if (i < sources.length - 1) {
      await sleep(3000);
    }
  }

  // Cleanup tmp
  await fs.remove(tmpDir);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
