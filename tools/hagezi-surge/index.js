"use strict";

const { resolve, join } = require("path");
const fs = require("fs-extra");
const slugify = require("@sindresorhus/slugify");
const axios = require("axios");

// Output directory: ../../dist/surge
const distDir = resolve(__dirname, "..", "..", "dist", "surge");

const configurations = [
  {
    name: "Hagezi Anti-Piracy Filter",
    type: "wildcard",
    sources: [
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/anti.piracy-onlydomains.txt"
    ]
  },
  {
    name: "Hagezi Native Tracker Filter",
    type: "wildcard",
    sources: [
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/native.amazon-onlydomains.txt",
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/native.apple-onlydomains.txt",
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/native.huawei-onlydomains.txt",
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/native.lgwebos-onlydomains.txt",
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/native.oppo-realme-onlydomains.txt",
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/native.roku-onlydomains.txt",
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/native.samsung-onlydomains.txt",
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/native.tiktok-onlydomains.txt",
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/native.tiktok.extended-onlydomains.txt",
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/native.vivo-onlydomains.txt",
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/native.winoffice-onlydomains.txt",
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/native.xiaomi-onlydomains.txt"
    ]
  },
  {
    name: "Hagezi NSFW Filter",
    type: "wildcard",
    sources: [
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/nsfw-onlydomains.txt"
    ]
  },
  {
    name: "Hagezi Threat Intelligence Feeds",
    type: "wildcard",
    sources: [
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/tif-onlydomains.txt"
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

async function processList(config) {
    const allDomains = new Set();
    
    for (const url of config.sources) {
        const content = await downloadList(url);
        if (!content) continue;

        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            let domain = trimmed;
            
            // Normalize: remove leading *. or .
            if (domain.startsWith('*.')) {
                domain = domain.substring(2); 
            } else if (domain.startsWith('.')) {
                domain = domain.substring(1);
            }
            
            // Surge DOMAIN-SET:
            // "If a line begins with . matches all sub-domains and the domain name itself."
            // So we just add "." + domain
            if (domain) {
                allDomains.add('.' + domain);
            }
        }
    }
    
    return Array.from(allDomains).sort();
}

async function outputCompiled(config, domains) {
    const baseName = slugify(config.name);
    // e.g. hagezi-anti-piracy-filter.txt
    const fileName = `${baseName}.txt`;
    const filePath = join(distDir, fileName);

    console.log(`Writing ${fileName} (${domains.length} rules)...`);
    const writeStream = fs.createWriteStream(filePath);
    
    for (const domain of domains) {
        writeStream.write(domain + "\n");
    }

    writeStream.end();
    await new Promise((resolve) => writeStream.on('finish', resolve));
}

async function main() {
  await fs.ensureDir(distDir);
  
  for (const config of configurations) {
    console.log(`Processing ${config.name}...`);
    try {
        const domains = await processList(config);
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
