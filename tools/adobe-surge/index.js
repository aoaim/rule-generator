"use strict";

const { resolve, join } = require("path");
const fs = require("fs-extra");
const axios = require("axios");

// Output directory: ../../dist/surge
const distDir = resolve(__dirname, "..", "..", "dist", "surge");

// Sources defined explicitly here for visibility
const sources = [
    'https://raw.githubusercontent.com/Ruddernation-Designs/Adobe-URL-Block-List/master/hosts',
    'https://raw.githubusercontent.com/ignaciocastro/a-dove-is-dumb/main/list.txt',
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

async function processHosts() {
    const allDomains = new Set();
    
    for (const url of sources) {
        const content = await downloadList(url);
        if (!content) continue;

        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            // Remove inline comments
            const cleanLine = trimmed.split('#')[0].trim();
            if (!cleanLine) continue;

            const parts = cleanLine.split(/\s+/);
            
            // Extract domain from lines like "127.0.0.1 adobe.com"
            if (parts.length >= 1) {
                const domainCandidate = parts[parts.length - 1];
                
                // Basic validation
                if (domainCandidate === 'localhost' || domainCandidate === 'broadcasthost' || domainCandidate === '::1') continue;
                if (/^\d+\.\d+\.\d+\.\d+$/.test(domainCandidate)) continue; // Skip IPs

                // Normalize: remove trailing dot if present
                let domain = domainCandidate.replace(/\.$/, '').toLowerCase();
                
                if (domain) {
                    allDomains.add(domain);
                }
            }
        }
    }
    
    return Array.from(allDomains).sort((a, b) => a.localeCompare(b));
}

async function outputRules(domains) {
    const fileName = "adobe-verification.txt";
    const filePath = join(distDir, fileName);

    console.log(`Writing ${fileName} (${domains.length} rules)...`);
    
    // DOMAIN-SET format for Surge: just the domain or .domain
    // No header needed for simple domain set file usually, or just comments
    
    const writeStream = fs.createWriteStream(filePath);
    
    for (const domain of domains) {
        // user requested DOMAIN-SET style (like hagezi)
        // If it was DOMAIN-SUFFIX,adobe.com -> now just .adobe.com or adobe.com
        // Our processHosts logic already prepares "clean" domains.
        // If we want to match subdomains, prepend "."
        writeStream.write(`.${domain}\n`);
    }

    writeStream.end();
  
    await new Promise((resolve) => writeStream.on('finish', resolve));
    console.log(`Generated ${fileName}`);
}

async function main() {
  await fs.ensureDir(distDir);
  
  try {
      const domains = await processHosts();
      await outputRules(domains);
  } catch (err) {
      console.error(`Error processing Adobe Surge rules:`, err);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
