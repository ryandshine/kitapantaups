process.env.DATABASE_URL = 'postgresql://gealgeolgeo:GeoSecure2026R3set@localhost:5434/kitapantaups';
import { AduanRepository } from '../src/repositories/aduan.repository.js';

async function test() {
    try {
        const result = await AduanRepository.findAndCountAll([], [], 1, 0);
        console.log('Result item 0:', JSON.stringify(result.data[0], null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}
test();
