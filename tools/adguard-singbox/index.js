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

async function downloadFile(url, dest) {
  try {
    console.log(`Downloading ${url}...`);
    const response = await axios.get(url, { responseType: "arraybuffer" });
    await fs.writeFile(dest, response.data);
    return true;
  } catch (error) {
    console.error(`Error downloading ${url}:`, error.message);
    return false;
  }
}

const singBoxBin = resolve(__dirname, "..", "..", "sing-box");

async function convertRule(sourceName, inputPath) {
  const srsFileName = `${sourceName}.srs`;
  const outputPath = join(distDir, srsFileName);

  try {
    console.log(`Converting ${sourceName} to ${srsFileName}...`);
    // sing-box rule-set convert "input" --output "output" --type adguard
    execSync(`"${singBoxBin}" rule-set convert "${inputPath}" --output "${outputPath}" --type adguard`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Error converting ${sourceName}:`, error.message);
    return false;
  }
}

async function main() {
  await fs.ensureDir(distDir);
  await fs.ensureDir(tmpDir);

  // Clean up old srs files
  await fs.emptyDir(distDir);

  for (const source of sources) {
    const inputPath = join(tmpDir, `${source.name}.txt`);

    const downloaded = await downloadFile(source.url, inputPath);
    if (downloaded) {
      await convertRule(source.name, inputPath);
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
