"use strict";

const compile = require("@adguard/hostlist-compiler");
const { resolve, join } = require("path");
const fs = require("fs-extra");
const slugify = require("@sindresorhus/slugify");

const distDir = resolve(__dirname, "..", "..", "dist", "surge");
const configurations = [
  {
    name: "Adguard Tracking Protection filter",
    sources: [
      {
        source:
          "https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_3_Spyware/filter.txt",
      },
    ],
    transformations: [
      "RemoveComments",
      "RemoveModifiers",
      "Validate",
      "Deduplicate",
    ],
  },
  {
    name: "Adguard Chinese filter",
    sources: [
      {
        source:
          "https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_224_Chinese/filter.txt",
      },
    ],
    transformations: [
      "RemoveComments",
      "RemoveModifiers",
      "Validate",
      "Deduplicate",
    ],
  },
  {
    name: "Adguard Base filter",
    sources: [
      {
        source:
          "https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_2_Base/filter.txt",
      },
    ],
    transformations: [
      "RemoveComments",
      "RemoveModifiers",
      "Validate",
      "Deduplicate",
    ],
  },
  {
    name: "Adguard DNS filter",
    sources: [
      {
        source:
          "https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_15_DnsFilter/filter.txt",
      },
    ],
    transformations: [
      "RemoveComments",
      "RemoveModifiers",
      "Validate",
      "Deduplicate",
    ],
  },
];

const outputFiles = configurations.map(
  (config) => `${slugify(config.name)}.txt`,
);

function formatRule(rule) {
  const reg = /^\|\|(.*)\^$/;

  if (!reg.test(rule)) {
    return;
  }

  const domain = rule.match(reg)[1];

  return "." + domain;
}

async function outputCompiled(config, compiled) {
  const fileName = `${slugify(config.name)}.txt`;
  const dest = join(distDir, fileName);

  await fs.ensureDir(distDir);

  if (await fs.pathExists(dest)) {
    await fs.remove(dest);
  }

  const stream = fs.createWriteStream(dest);

  for (const rule of compiled) {
    const formatted = formatRule(rule);

    if (formatted) {
      if (formatted.includes("*")) {
        console.warn("⚠️", formatted, "is skipped because it contains *");
        continue;
      }

      stream.write(formatted + "\n");
    }
  }

  stream.end();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function compileWithRetry(config, retries = 5, backoff = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await compile(config);
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      const wait = backoff * attempt;
      console.warn(
        `⚠️ Attempt ${attempt} failed for "${config.name}": ${err.message}. Retrying in ${wait}ms...`,
      );
      await sleep(wait);
    }
  }
}

async function main() {
  await fs.ensureDir(distDir);
  for (const filename of outputFiles) {
    await fs.remove(join(distDir, filename)).catch(() => {});
  }

  for (let i = 0; i < configurations.length; i++) {
    const config = configurations[i];
    const compiled = await compileWithRetry(config);
    await outputCompiled(config, compiled);
    // Throttle between requests to avoid GitHub raw 429 rate limiting
    if (i < configurations.length - 1) {
      await sleep(3000);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
