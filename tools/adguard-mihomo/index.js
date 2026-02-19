"use strict";

const compile = require("@adguard/hostlist-compiler");
const { resolve, join } = require("path");
const fs = require("fs-extra");
const slugify = require("@sindresorhus/slugify");
const { execSync } = require("child_process");

const distDir = resolve(__dirname, "..", "..", "dist", "mihomo");
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
];

function extractDomain(rule) {
  const reg = /^\|\|(.+)\^$/;

  if (!reg.test(rule)) {
    return;
  }

  const domain = rule.match(reg)[1];

  // Skip wildcard domains
  if (domain.includes("*")) {
    return;
  }

  return "+." + domain;
}

async function outputCompiled(config, compiled) {
  const baseName = slugify(config.name);
  const txtFileName = `${baseName}.txt`;
  const mrsFileName = `${baseName}.mrs`;

  const txtPath = join(distDir, txtFileName);
  const mrsPath = join(distDir, mrsFileName);

  await fs.ensureDir(distDir);

  const domains = new Set();

  for (const rule of compiled) {
    const domain = extractDomain(rule);
    if (domain) {
      domains.add(domain);
    }
  }

  const sorted = Array.from(domains).sort();

  console.log(`Writing ${txtFileName} (${sorted.length} rules)...`);
  const stream = fs.createWriteStream(txtPath);

  for (const domain of sorted) {
    stream.write(domain + "\n");
  }

  stream.end();
  await new Promise((resolve) => stream.on("finish", resolve));

  // Generate MRS using mihomo
  const mihomoBin = "mihomo";
  try {
    console.log(`Converting to MRS: ${mrsFileName}...`);
    execSync(
      `${mihomoBin} convert-ruleset domain text "${txtPath}" "${mrsPath}"`,
      { stdio: "inherit" },
    );
    console.log(`Successfully generated ${mrsFileName}`);
  } catch (error) {
    console.error(`Failed to generate MRS for ${config.name}:`, error.message);
  }
}

async function main() {
  await fs.ensureDir(distDir);

  for (const config of configurations) {
    console.log(`Processing ${config.name}...`);
    const compiled = await compile(config);
    await outputCompiled(config, compiled);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
