import { query } from "../db.js";

let waybillsTablesReadyPromise: Promise<void> | null = null;

/** Ensures waybills and waybill_photos tables and indexes exist. */
export async function ensureWaybillsTables(): Promise<void> {
  if (!waybillsTablesReadyPromise) {
    waybillsTablesReadyPromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS waybills (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          reference_id text,
          waybill_number text NOT NULL,
          issued_date date NOT NULL DEFAULT CURRENT_DATE,
          status text NOT NULL DEFAULT 'in_transit' CHECK (status IN ('in_transit', 'delivered', 'cancelled')),
          offtaker_id uuid REFERENCES offtakers(id) ON DELETE SET NULL,
          buyer_name text,
          aggregator_id uuid REFERENCES aggregators(id) ON DELETE SET NULL,
          aggregator_name text,
          loading_location text,
          loading_region text,
          discharge_location text,
          product_name text,
          product_description text,
          bag_count integer,
          bag_unit text DEFAULT 'Bags',
          weight_kg numeric(12, 2),
          received_weight_kg numeric(12, 2),
          driver_id uuid,
          driver_name text,
          driver_phone text,
          truck_number text,
          notes text,
          created_by uuid REFERENCES users(id) ON DELETE SET NULL,
          office_id uuid REFERENCES offices(id) ON DELETE SET NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz
        )
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_waybills_number
        ON waybills (waybill_number)
        WHERE deleted_at IS NULL
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_waybills_reference_id
        ON waybills (reference_id)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_waybills_issued_date
        ON waybills (issued_date DESC)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_waybills_status
        ON waybills (status)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_waybills_offtaker
        ON waybills (offtaker_id)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_waybills_aggregator
        ON waybills (aggregator_id)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_waybills_deleted_at
        ON waybills (deleted_at)
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS waybill_photos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          waybill_id uuid NOT NULL REFERENCES waybills(id) ON DELETE CASCADE,
          photo_type text NOT NULL CHECK (photo_type IN ('truck', 'waybill_doc')),
          file_name text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_waybill_photos_waybill
        ON waybill_photos (waybill_id)
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_waybill_photos_type
        ON waybill_photos (waybill_id, photo_type)
      `);

      try {
        await query(`ALTER TABLE waybills ENABLE ROW LEVEL SECURITY`);
        await query(`ALTER TABLE waybill_photos ENABLE ROW LEVEL SECURITY`);
        await query(`DROP POLICY IF EXISTS "Service role full access on waybills" ON waybills`);
        await query(`
          CREATE POLICY "Service role full access on waybills"
          ON waybills FOR ALL TO service_role USING (true) WITH CHECK (true)
        `);
        await query(`DROP POLICY IF EXISTS "Service role full access on waybill_photos" ON waybill_photos`);
        await query(`
          CREATE POLICY "Service role full access on waybill_photos"
          ON waybill_photos FOR ALL TO service_role USING (true) WITH CHECK (true)
        `);
      } catch {
        // Local PostgreSQL instances without Supabase's `service_role` can safely ignore policy creation
      }
    })().catch((err) => {
      waybillsTablesReadyPromise = null;
      throw err;
    });
  }
  return waybillsTablesReadyPromise;
}
