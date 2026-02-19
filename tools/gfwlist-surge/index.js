"use strict";

const { resolve, join } = require("path");
const fs = require("fs-extra");
const axios = require("axios");

const distDir = resolve(__dirname, "..", "..", "dist", "surge");

const GFWLIST_URL =
  "https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt";

async function downloadAndDecode(url) {
  console.log(`Downloading ${url}...`);
  const response = await axios.get(url);
  const decoded = Buffer.from(response.data, "base64").toString("utf-8");
  return decoded;
}

function extractDomains(content) {
  const domains = new Set();
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, comments, and whitelist entries
    if (!trimmed || trimmed.startsWith("!") || trimmed.startsWith("@@")) {
      continue;
    }

    // Skip regex rules
    if (trimmed.startsWith("/") && trimmed.endsWith("/")) {
      continue;
    }

    // Skip [AutoProxy] header
    if (trimmed.startsWith("[")) {
      continue;
    }

    let domain = null;

    // ||domain.com - domain match (most reliable)
    const domainMatch = trimmed.match(/^\|\|([a-zA-Z0-9][\w.-]+\.[a-zA-Z]{2,})/);
    if (domainMatch) {
      domain = domainMatch[1].toLowerCase();
    }

    // |http(s)://domain.com/ - URL match, extract domain
    if (!domain) {
      const urlMatch = trimmed.match(
        /^\|?https?:\/\/([a-zA-Z0-9][\w.-]+\.[a-zA-Z]{2,})/,
      );
      if (urlMatch) {
        domain = urlMatch[1].toLowerCase();
      }
    }

    // Plain domain-like entries (e.g. "example.com")
    if (!domain) {
      const plainMatch = trimmed.match(
        /^([a-zA-Z0-9][\w.-]+\.[a-zA-Z]{2,})$/,
      );
      if (plainMatch) {
        domain = plainMatch[1].toLowerCase();
      }
    }

    if (domain) {
      // Skip IP addresses
      if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) continue;

      // Skip domains with wildcards
      if (domain.includes("*")) continue;

      domains.add(domain);
    }
  }

  return Array.from(domains).sort();
}

async function outputRules(domains) {
  const fileName = "gfwlist.txt";
  const filePath = join(distDir, fileName);

  await fs.ensureDir(distDir);

  console.log(`Writing ${fileName} (${domains.length} domains)...`);

  const stream = fs.createWriteStream(filePath);

  for (const domain of domains) {
    stream.write(`.${domain}\n`);
  }

  stream.end();
  await new Promise((resolve) => stream.on("finish", resolve));
  console.log(`Generated ${fileName}`);
}

async function main() {
  await fs.ensureDir(distDir);

  const content = await downloadAndDecode(GFWLIST_URL);
  const domains = extractDomains(content);
  await outputRules(domains);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
