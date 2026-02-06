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
    name: "Hagezi Anti-Piracy Filter",
    type: "wildcard",
    sources: [
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/anti.piracy-onlydomains.txt"
    ]
  },
//   {
//     name: "HaGeZi Multi Pro", // Example of another potential list
//     type: "wildcard",
//     sources: ["..."] 
//   },
  {
    name: "Hagezi Native Tracker Filter", // Result: hagezi-native-tracker-filter.txt
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
  }
];

// Helper to download text content
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

async function processWildcardList(config) {
    const allDomains = new Set();
    
    for (const url of config.sources) {
        const content = await downloadList(url);
        if (!content) continue;

        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            // HaGeZi Wildcard format:
            // # Comments
            // *.example.com
            // example.org
            
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            // For Mihomo "domain" ruleset type:
            // "If you want to match a domain and all its subdomains, you should add a dot . before the domain."
            // "For example, .google.com matches google.com and mail.google.com."
            // "If you want to exact match a domain, you should not add a dot."
            //
            // HaGeZi's wildcard format usually uses `*.example.com`.
            // While `*.example.com` is valid glob, typical Mihomo usage for simple domain matching prefers `.example.com`
            // Let's convert `*.example.com` -> `.example.com`
            // And plain `example.com` -> `.example.com` (assumption: blocklists usually intend to block subdomains too)
            
            let domain = trimmed;
            
            // Normalize: remove leading *. or .
            if (domain.startsWith('*.')) {
                domain = domain.substring(2); 
            } else if (domain.startsWith('.')) {
                domain = domain.substring(1);
            }
            
            // Use the "+" wildcard: "+.example.com" matches "example.com" and "*.example.com"
            if (domain) {
                allDomains.add('+.' + domain);
            }
        }
    }
    
    return Array.from(allDomains).sort();
}

async function outputCompiled(config, domains) {
    const baseName = slugify(config.name);
    // User requested "hagezi-native-tracker" naming specifically for that one, 
    // slugify("HaGeZi Native Tracker") -> "hagezi-native-tracker" (perfect).
    
    const txtFileName = `${baseName}.txt`;
    const mrsFileName = `${baseName}.mrs`;
  
    const txtPath = join(distDir, txtFileName);
    const mrsPath = join(distDir, mrsFileName);

    console.log(`Writing ${txtFileName} (${domains.length} rules)...`);
    const writeStream = fs.createWriteStream(txtPath);
    
    let ruleCount = 0;
    for (const domain of domains) {
        writeStream.write(domain + "\n");
        ruleCount++;
    }

    writeStream.end();
  
    await new Promise((resolve) => writeStream.on('finish', resolve));

    // Generate MRS using mihomo
    const localMihomoBin = resolve(__dirname, "..", "..", "mihomo");
    const mihomoBin = fs.existsSync(localMihomoBin) ? `"${localMihomoBin}"` : "mihomo";
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
  
  // Clean up old files - REMOVED
  // We do not want to wipe the directory because other tools (adobe-mihomo) also write here.
  // The specific files will be overwritten by the writeStream/convert-ruleset calls.
  
  for (const config of configurations) {
    console.log(`Processing ${config.name}...`);
    try {
        const domains = await processWildcardList(config);
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
