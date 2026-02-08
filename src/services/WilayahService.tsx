import { supabase } from "../lib/supabase";

export const WilayahService = {
  async findKecamatan(kabupatenNama: string, kelurahanNama: string): Promise<string | null> {
    try {
      // Query langsung ke tabel flat
      const { data, error } = await supabase
        .from('wilayah_indonesia')
        .select('kecamatan')
        .ilike('kabupaten_kota', `%${kabupatenNama}%`)
        .ilike('kelurahan_desa', `%${kelurahanNama}%`)
        .limit(1);

      if (error) {
        console.error('Supabase query error:', error);
        return null;
      }

      return data && data.length > 0 ? data[0].kecamatan : null;

    } catch (error) {
      console.error('Error in findKecamatan:', error);
      return null;
    }
  },

  // OPTIONAL: Batch processing dengan single query (lebih efisien)
  async findKecamatanBatch(pairs: Array<{kabupaten: string; kelurahan: string}>): Promise<Array<{kabupaten: string; kelurahan: string; kecamatan: string | null}>> {
    const results = [];
    
    // Buat query OR untuk semua pasangan
    const orConditions = pairs.map(pair => 
      `and(kabupaten_kota.ilike.%${pair.kabupaten}%,kelurahan_desa.ilike.%${pair.keluahan}%)`
    ).join(',');

    const { data, error } = await supabase
      .from('wilayah_indonesia')
      .select('kabupaten_kota, kelurahan_desa, kecamatan')
      .or(orConditions);

    if (!error && data) {
      // Map hasil ke format yang diinginkan
      pairs.forEach(pair => {
        const found = data.find(d => 
          d.kabupaten_kota.includes(pair.kabupaten) && 
          d.kelurahan_desa.includes(pair.kelurahan)
        );
        results.push({
          ...pair,
          kecamatan: found ? found.kecamatan : null
        });
      });
    }
    
    return results;
  }
};