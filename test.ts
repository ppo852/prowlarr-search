import { tmdbAPI } from './src/lib/tmdb';

async function testSearch() {
    console.log("\n=== Test The Mentalist ===");
    await tmdbAPI.searchTitle("The Mentalist iNTEGRALE MULTi 1080p WEB H264-FW (Mentalist)");
    
    console.log("\n=== Test Kaamelott ===");
    await tmdbAPI.searchTitle("Kaamelott. 2005 .INTEGRAL.FRENCH.1080p.BDRip.10bits.x265-Themouche (+Bonus)");
}

testSearch();
