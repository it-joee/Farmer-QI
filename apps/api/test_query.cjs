const { Pool } = require('pg');
require('dotenv').config({path: '../../.env'});
require('dotenv').config({path: '../../.env.local', override: true});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const result = await pool.query('SELECT f.id, f.primary_crops, f.created_by FROM farmers f WHERE f.primary_crops @> $1::jsonb LIMIT 20 OFFSET 0', ['["Shea"]']);
  console.log('Row count SELECT:', result.rowCount);

  const countResult = await pool.query('SELECT COUNT(*) FROM farmers f WHERE f.primary_crops @> $1::jsonb', ['["Shea"]']);
  console.log('Row count COUNT:', countResult.rows[0].count);
  pool.end();
}
run().catch(console.error);
