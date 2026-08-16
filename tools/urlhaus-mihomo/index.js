"use strict";

const { resolve, join } = require("path");
const fs = require("fs-extra");
const slugify = require("@sindresorhus/slugify");
const { execSync } = require("child_process");
const axios = require("axios");

// Output directory: ../../dist/mihomo
const distDir = resolve(__dirname, "..", "..", "dist", "mihomo");

const configurations = [
  {
    name: "URLhaus Malicious URL Blocklist",
    type: "adguard",
    // Lite (online-only) version in AdGuard Home format: `||domain^`
    sources: [
        "https://malware-filter.gitlab.io/malware-filter/urlhaus-filter-agh-online.txt"
    ]
  }
];

async function downloadList(url) {
    try {
        console.log(`Downloading ${url}...`);
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`Error downloading ${url}:`, error.message);
        return "";
    }
}

// AdGuard Home filter line: `||domain^`
const ADGUARD_RULE = /^\|\|(.+)\^$/;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const VALID_DOMAIN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

// The agh list mixes domains and IP addresses.
// Proxy rule-sets (Surge/Mihomo/sing-box) are domain-based, so IPs must be dropped.
function extractDomain(line) {
    const match = line.match(ADGUARD_RULE);
    if (!match) return null;

    let domain = match[1].toLowerCase();

    // Normalize: remove leading . or *. (e.g. "||.222.167.7^")
    if (domain.startsWith("*.")) {
        domain = domain.substring(2);
    } else if (domain.startsWith(".")) {
        domain = domain.substring(1);
    }

    // Skip wildcard entries and IP addresses
    if (domain.includes("*") || domain.includes(":")) return null;
    if (IPV4.test(domain)) return null;
    if (!VALID_DOMAIN.test(domain)) return null;

    // Reject malformed IPs that slipped past the IPv4 check,
    // e.g. "222.167.7" (3 octets) — a numeric TLD is never a valid domain
    const labels = domain.split(".");
    if (/^\d+$/.test(labels[labels.length - 1])) return null;

    return domain;
}

async function processList(config) {
    const allDomains = new Set();

    for (const url of config.sources) {
        const content = await downloadList(url);
        if (!content) continue;

        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('#')) continue;

            const domain = extractDomain(trimmed);
            if (!domain) continue;

            // For Mihomo "domain" ruleset type:
            // "+.example.com" matches "example.com" and all subdomains.
            allDomains.add('+.' + domain);
        }
    }

    return Array.from(allDomains).sort();
}

async function outputCompiled(config, domains) {
    // decamelize: false — otherwise "URLhaus" would be split into "UR Lhaus"
    // (see the [A-Z]+/[A-Z][a-rt-z\d]+ split rule in @sindresorhus/slugify)
    const baseName = slugify(config.name, { decamelize: false });
    // e.g. urlhaus-malicious-url-blocklist.txt / .mrs
    const txtFileName = `${baseName}.txt`;
    const mrsFileName = `${baseName}.mrs`;

    const txtPath = join(distDir, txtFileName);
    const mrsPath = join(distDir, mrsFileName);

    console.log(`Writing ${txtFileName} (${domains.length} rules)...`);
    const writeStream = fs.createWriteStream(txtPath);

    for (const domain of domains) {
        writeStream.write(domain + "\n");
    }

    writeStream.end();

    await new Promise((resolve) => writeStream.on('finish', resolve));

    // Generate MRS using mihomo
    const mihomoBin = "mihomo";
    try {
        console.log(`Converting to MRS: ${mrsFileName}...`);
        execSync(`${mihomoBin} convert-ruleset domain text "${txtPath}" "${mrsPath}"`, { stdio: 'inherit' });
        console.log(`Successfully generated ${mrsFileName}`);
    } catch (error) {
        console.error(`Failed to generate MRS for ${config.name}:`, error.message);
    }
}

async function main() {
  await fs.ensureDir(distDir);

  for (const config of configurations) {
    console.log(`Processing ${config.name}...`);
    try {
        const domains = await processList(config);
        // Guard: never overwrite existing output with an empty ruleset
        // (e.g. when all downloads failed)
        if (domains.length === 0) {
            console.warn(`No domains found for ${config.name}; skipping output.`);
            continue;
        }
        await outputCompiled(config, domains);
    } catch (err) {
        console.error(`Error processing ${config.name}:`, err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
